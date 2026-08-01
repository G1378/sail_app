import { supabase, type DbBoat, type DbSailor, type DbSessionBoat } from "@/lib/supabase";
import type { Boat, Sailor, BoatType, FleetBoat } from "@/types";

// ── Mappers ────────────────────────────────────────────────────

function dbBoatToBoat(row: DbBoat): Boat {
  // Legacy `boats` table only ever has two physical seat columns (helm/crew).
  // Synthesize the generalized seat array from them, sized to capacity.
  const seats: (string | null)[] = row.capacity <= 1 ? [row.helm] : [row.helm, row.crew];
  while (seats.length < row.capacity) seats.push(null);

  return {
    id:              row.id,
    name:            row.name,
    type:            row.type,
    instructor:      row.instructor,
    assignedSailors: seats.slice(0, row.capacity),
    goal:            row.goal,
    capacity:        row.capacity,
    status:          row.status,
    warning:         row.warning,
  };
}

function dbSessionBoatToBoat(row: DbSessionBoat): Boat {
  const boatInfo = Array.isArray(row.boats) ? row.boats[0] : row.boats;
  const capacity = boatInfo?.capacity ?? row.assigned_sailors.length;
  const seats = [...row.assigned_sailors];
  while (seats.length < capacity) seats.push(null);

  return {
    id:              row.id,
    boatId:          row.boat_id,
    name:            boatInfo?.name ?? "Unknown boat",
    type:            boatInfo?.type ?? "Pico",
    instructor:      row.instructor,
    assignedSailors: seats.slice(0, capacity),
    goal:            row.goal,
    capacity,
    status:          row.status,
    warning:         row.warning,
  };
}

function dbSailorToSailor(row: DbSailor): Sailor {
  return {
    id:         row.id,
    name:       row.name,
    stage:      parseInt(row.stage) as 1 | 2 | 3 | 4,
    confidence: row.confidence,
    role:       row.role,
    skills:     row.skills,
  };
}

// ── Loaders ────────────────────────────────────────────────────

export async function loadBoats(): Promise<Boat[]> {
  const { data, error } = await supabase
    .from("boats")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`loadBoats: ${error.message}`);
  return (data as DbBoat[]).map(dbBoatToBoat);
}

export async function loadSailors(): Promise<Sailor[]> {
  const { data, error } = await supabase
    .from("sailors")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(`loadSailors: ${error.message}`);
  return (data as DbSailor[]).map(dbSailorToSailor);
}

export async function loadInstructors(): Promise<string[]> {
  const { data, error } = await supabase
    .from("instructors")
    .select("name")
    .order("name", { ascending: true });

  if (error) throw new Error(`loadInstructors: ${error.message}`);
  return (data as { name: string }[]).map((r) => r.name);
}

/** Load instructor names from instructor_signups — used by the planner when opened with ?session=id */
export async function loadInstructorsFromSession(sessionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("instructor_signups")
    .select(`
      sailor_profile_id,
      sailor_profiles ( name )
    `)
    .eq("session_id", sessionId);

  if (error) throw new Error(`loadInstructorsFromSession: ${error.message}`);

  type Row = { sailor_profiles: { name: string } | { name: string }[] | null };

  return (data as Row[] ?? [])
    .flatMap((row) => {
      const p = row.sailor_profiles;
      if (!p) return [];
      const profile = Array.isArray(p) ? p[0] : p;
      return profile ? [profile.name] : [];
    });
}

// ── Savers ─────────────────────────────────────────────────────

/** Upsert a single boat (updates all mutable fields) — legacy, no-session board only */
export async function saveBoat(boat: Boat): Promise<void> {
  const { error } = await supabase
    .from("boats")
    .update({
      instructor: boat.instructor,
      helm:       boat.assignedSailors[0] ?? null,
      crew:       boat.assignedSailors[1] ?? null,
      goal:       boat.goal,
      filled:     boat.assignedSailors.filter(Boolean).length,
      status:     boat.status,
      warning:    boat.warning,
    })
    .eq("id", boat.id);

  if (error) throw new Error(`saveBoat: ${error.message}`);
}

/** Persist the full boat order after a drag-reorder — legacy, no-session board only */
export async function saveBoatOrder(boats: Boat[]): Promise<void> {
  const updates = boats.map((b, i) =>
    supabase.from("boats").update({ sort_order: i }).eq("id", b.id)
  );
  await Promise.all(updates);
}

// ── Session-scoped fleet board ──────────────────────────────────
// Each session gets its own independent board. `boats` is the club's
// fleet catalog (name/type/capacity); `session_boats` is a join row
// per boat that's been added to a particular session's board, holding
// that session's own instructor/seat/status state.

/** Counts of each role in the caller's own club — RLS already scopes this to their club */
export async function loadClubMemberCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("sailor_profiles").select("user_role");
  if (error) throw new Error(`loadClubMemberCounts: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const row of data as { user_role: string }[]) {
    counts[row.user_role] = (counts[row.user_role] ?? 0) + 1;
  }
  return counts;
}

export interface ClubLocation {
  name: string;
  lat: number;
  lon: number;
}

/**
 * The caller's own club's saved weather location. RLS scopes the `clubs`
 * table to the caller's own club (same pattern as loadClubMemberCounts),
 * so no explicit club id filter is needed here.
 *
 * Returns null if the club hasn't set a location yet — callers should fall
 * back to a sensible default (see DEFAULT_LOCATION in lib/useWeather.ts).
 */
export async function loadClubLocation(): Promise<ClubLocation | null> {
  const { data, error } = await supabase
    .from("clubs")
    .select("location_name, location_lat, location_lon")
    .maybeSingle();

  if (error) throw new Error(`loadClubLocation: ${error.message}`);
  if (!data || data.location_lat == null || data.location_lon == null) return null;

  return {
    name: data.location_name ?? "Club location",
    lat:  data.location_lat,
    lon:  data.location_lon,
  };
}

/** Sets the club's weather location — club manager only (enforced by RLS) */
export async function saveClubLocation(location: ClubLocation): Promise<void> {
  // supabase-js refuses to run an UPDATE with no explicit filter, even
  // though RLS already scopes `clubs` to the caller's own club. So we
  // look up that club's id first, then filter on it explicitly.
  const { data: club, error: lookupError } = await supabase
    .from("clubs")
    .select("id")
    .maybeSingle();

  if (lookupError) throw new Error(`saveClubLocation: ${lookupError.message}`);
  if (!club) throw new Error("saveClubLocation: couldn't find your club");

  const { error } = await supabase
    .from("clubs")
    .update({
      location_name: location.name,
      location_lat:  location.lat,
      location_lon:  location.lon,
    })
    .eq("id", club.id);

  if (error) throw new Error(`saveClubLocation: ${error.message}`);
}

/** Every boat in the club's fleet catalog, regardless of whether it's on any board */
export async function loadFleetBoats(): Promise<FleetBoat[]> {
  const { data, error } = await supabase
    .from("boats")
    .select("id, name, type, capacity")
    .order("name", { ascending: true });

  if (error) throw new Error(`loadFleetBoats: ${error.message}`);
  return data as FleetBoat[];
}

/** Boats currently on a specific session's board */
export async function loadSessionBoats(sessionId: string): Promise<Boat[]> {
  const { data, error } = await supabase
    .from("session_boats")
    .select(`*, boats ( name, type, capacity )`)
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`loadSessionBoats: ${error.message}`);
  return (data as DbSessionBoat[]).map(dbSessionBoatToBoat);
}

/** Add a fleet boat onto a session's board — lands in the Unassigned section, empty seats */
export async function addBoatToSession(sessionId: string, fleetBoatId: string, capacity: number): Promise<Boat> {
  const { data, error } = await supabase
    .from("session_boats")
    .insert({
      session_id:       sessionId,
      boat_id:          fleetBoatId,
      assigned_sailors: Array(capacity).fill(null),
      goal:             "",
      status:           "idle",
      sort_order:       9999,
    })
    .select(`*, boats ( name, type, capacity )`)
    .single();

  if (error) throw new Error(`addBoatToSession: ${error.message}`);
  return dbSessionBoatToBoat(data as DbSessionBoat);
}

/** Take a boat off a session's board — it becomes available in the fleet pool again */
export async function removeBoatFromSession(sessionBoatId: string): Promise<void> {
  const { error } = await supabase.from("session_boats").delete().eq("id", sessionBoatId);
  if (error) throw new Error(`removeBoatFromSession: ${error.message}`);
}

/** Upsert a single session-board boat (updates all mutable fields) */
export async function saveSessionBoat(boat: Boat): Promise<void> {
  const { error } = await supabase
    .from("session_boats")
    .update({
      instructor:       boat.instructor,
      assigned_sailors: boat.assignedSailors,
      goal:             boat.goal,
      status:           boat.status,
      warning:          boat.warning,
    })
    .eq("id", boat.id);

  if (error) throw new Error(`saveSessionBoat: ${error.message}`);
}

/** Persist the full board order after a drag-reorder, for a session's board */
export async function saveSessionBoatOrder(boats: Boat[]): Promise<void> {
  const updates = boats.map((b, i) =>
    supabase.from("session_boats").update({ sort_order: i }).eq("id", b.id)
  );
  await Promise.all(updates);
}

/** Add a new boat to the club fleet — club manager only (enforced by RLS) */
export async function createBoat(input: { name: string; type: BoatType; capacity: number }): Promise<Boat> {
  const { data, error } = await supabase
    .from("boats")
    .insert({
      name:       input.name,
      type:       input.type,
      capacity:   input.capacity,
      instructor: null,
      helm:       null,
      crew:       null,
      goal:       "",
      filled:     0,
      status:     "idle",
      warning:    null,
      sort_order: 9999,
    })
    .select()
    .single();

  if (error) throw new Error(`createBoat: ${error.message}`);
  return dbBoatToBoat(data as DbBoat);
}

/**
 * Add several boats of the same class at once — e.g. "Feva" x 6 creates
 * "Feva 1".."Feva 6". Club manager only (enforced by RLS).
 */
export async function createBoats(input: {
  namePrefix: string;
  type: BoatType;
  capacity: number;
  quantity: number;
}): Promise<Boat[]> {
  const rows = Array.from({ length: input.quantity }, (_, i) => ({
    name:       input.quantity > 1 ? `${input.namePrefix} ${i + 1}` : input.namePrefix,
    type:       input.type,
    capacity:   input.capacity,
    instructor: null,
    helm:       null,
    crew:       null,
    goal:       "",
    filled:     0,
    status:     "idle",
    warning:    null,
    sort_order: 9999,
  }));

  const { data, error } = await supabase.from("boats").insert(rows).select();
  if (error) throw new Error(`createBoats: ${error.message}`);
  return (data as DbBoat[]).map(dbBoatToBoat);
}

/** Remove a boat from the club fleet — club manager only (enforced by RLS) */
export async function deleteBoat(boatId: string): Promise<void> {
  const { error } = await supabase.from("boats").delete().eq("id", boatId);
  if (error) throw new Error(`deleteBoat: ${error.message}`);
}

/** Load sailors from session signups — used by the planner when opened with ?session=id */
export async function loadSailorsFromSession(sessionId: string): Promise<Sailor[]> {
  const { data, error } = await supabase
    .from("session_signups")
    .select(`
      sailor_profile_id,
      preferred_boat_type,
      sailor_profiles (
        id, name, stage, confidence, role, skills
      )
    `)
    .eq("session_id", sessionId);

  if (error) throw new Error(`loadSailorsFromSession: ${error.message}`);

  type Row = {
    sailor_profile_id: string;
    preferred_boat_type: string | null;
    sailor_profiles: { id: string; name: string; stage: string; confidence: string; role: string; skills: string[] } | { id: string; name: string; stage: string; confidence: string; role: string; skills: string[] }[] | null;
  };

  return (data as Row[] ?? [])
    .flatMap((row) => {
      const p = row.sailor_profiles;
      if (!p) return [];
      const profile = Array.isArray(p) ? p[0] : p;
      if (!profile) return [];
      return [{
        id:                profile.id,
        name:              profile.name,
        stage:             parseInt(profile.stage) as 1 | 2 | 3 | 4,
        confidence:        profile.confidence as Sailor["confidence"],
        role:              profile.role as Sailor["role"],
        skills:            profile.skills ?? [],
        preferredBoatType: row.preferred_boat_type,
      }];
    });
}

/** Remove a sailor from the pool (they've been assigned to a boat) */
export async function removeSailorFromPool(sailorId: string): Promise<void> {
  const { error } = await supabase
    .from("sailors")
    .delete()
    .eq("id", sailorId);

  if (error) throw new Error(`removeSailorFromPool: ${error.message}`);
}

/**
 * Puts a sailor back in the pool after being unassigned from a boat —
 * the mirror image of removeSailorFromPool. Legacy no-session board only:
 * a fresh row is inserted (the sailor gets a new id), since the original
 * row was deleted when they were assigned.
 */
export async function restoreSailorToPool(sailor: Sailor): Promise<Sailor> {
  const { data, error } = await supabase
    .from("sailors")
    .insert({
      name:       sailor.name,
      stage:      String(sailor.stage),
      confidence: sailor.confidence,
      role:       sailor.role,
      skills:     sailor.skills,
    })
    .select()
    .single();

  if (error) throw new Error(`restoreSailorToPool: ${error.message}`);
  return dbSailorToSailor(data as DbSailor);
}
