import { supabase, type DbBoat, type DbSailor } from "@/lib/supabase";
import type { Boat, Sailor } from "@/types";

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

/** Remove a sailor from the pool (they've been assigned to a boat) */
export async function removeSailorFromPool(sailorId: string): Promise<void> {
  const { error } = await supabase
    .from("sailors")
    .delete()
    .eq("id", sailorId);

  if (error) throw new Error(`removeSailorFromPool: ${error.message}`);
}
