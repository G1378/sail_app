import { supabase, type DbBoat, type DbSailor } from "@/lib/supabase";
import type { Boat, Sailor, BoatType } from "@/types";

// ── Mappers ────────────────────────────────────────────────────

function dbBoatToBoat(row: DbBoat): Boat {
  return {
    id:         row.id,
    name:       row.name,
    type:       row.type,
    instructor: row.instructor,
    helm:       row.helm,
    crew:       row.crew,
    goal:       row.goal,
    capacity:   row.capacity,
    filled:     row.filled,
    status:     row.status,
    warning:    row.warning,
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

/** Upsert a single boat (updates all mutable fields) */
export async function saveBoat(boat: Boat): Promise<void> {
  const { error } = await supabase
    .from("boats")
    .update({
      instructor: boat.instructor,
      helm:       boat.helm,
      crew:       boat.crew,
      goal:       boat.goal,
      filled:     boat.filled,
      status:     boat.status,
      warning:    boat.warning,
    })
    .eq("id", boat.id);

  if (error) throw new Error(`saveBoat: ${error.message}`);
}

/** Persist the full boat order after a drag-reorder */
export async function saveBoatOrder(boats: Boat[]): Promise<void> {
  const updates = boats.map((b, i) =>
    supabase.from("boats").update({ sort_order: i }).eq("id", b.id)
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
      sailor_profiles (
        id, name, stage, confidence, role, skills
      )
    `)
    .eq("session_id", sessionId);

  if (error) throw new Error(`loadSailorsFromSession: ${error.message}`);

  type Row = {
    sailor_profile_id: string;
    sailor_profiles: { id: string; name: string; stage: string; confidence: string; role: string; skills: string[] } | { id: string; name: string; stage: string; confidence: string; role: string; skills: string[] }[] | null;
  };

  return (data as Row[] ?? [])
    .flatMap((row) => {
      const p = row.sailor_profiles;
      if (!p) return [];
      const profile = Array.isArray(p) ? p[0] : p;
      if (!profile) return [];
      return [{
        id:         profile.id,
        name:       profile.name,
        stage:      parseInt(profile.stage) as 1 | 2 | 3 | 4,
        confidence: profile.confidence as Sailor["confidence"],
        role:       profile.role as Sailor["role"],
        skills:     profile.skills ?? [],
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
