import { supabase } from "@/lib/supabase";
import type { RyaStage, Confidence, SailorRole } from "@/types";

export interface RosterSailor {
  id: string;
  name: string;
  stage: RyaStage;
  confidence: Confidence;
  role: SailorRole;
  nextSteps: string;
}

/**
 * Every sailor in the caller's club. Visible to instructors, senior
 * instructors and club managers — RLS scopes `sailor_profiles` to the
 * caller's own club, same pattern as loadClubMemberCounts.
 */
export async function loadClubRoster(): Promise<RosterSailor[]> {
  const { data, error } = await supabase
    .from("sailor_profiles")
    .select("id, name, stage, confidence, role, next_steps")
    .eq("user_role", "sailor")
    .order("name", { ascending: true });

  if (error) throw new Error(`loadClubRoster: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id:         row.id,
    name:       row.name,
    stage:      parseInt(row.stage) as RyaStage,
    confidence: row.confidence as Confidence,
    role:       row.role as SailorRole,
    nextSteps:  row.next_steps ?? "",
  }));
}

export interface RosterUpdate {
  stage: RyaStage;
  confidence: Confidence;
  nextSteps: string;
}

/** Updates a sailor's stage / confidence / next steps — instructors, senior instructors and club managers (RLS) */
export async function updateRosterEntry(sailorId: string, update: RosterUpdate): Promise<void> {
  const { error } = await supabase
    .from("sailor_profiles")
    .update({
      stage:      String(update.stage),
      confidence: update.confidence,
      next_steps: update.nextSteps,
    })
    .eq("id", sailorId);

  if (error) throw new Error(`updateRosterEntry: ${error.message}`);
}

/** Removes a sailor from the club — club managers only (RLS) */
export async function removeSailorFromClub(sailorId: string): Promise<void> {
  const { error } = await supabase
    .from("sailor_profiles")
    .delete()
    .eq("id", sailorId);

  if (error) throw new Error(`removeSailorFromClub: ${error.message}`);
}
