import { supabase } from "@/lib/supabase";

export interface JoinCodeInfo {
  code: string;
  rotatedAt: string;
  expiresAt: string;
}

function toRow<T>(data: T | T[] | null): T | null {
  if (!data) return null;
  return Array.isArray(data) ? data[0] ?? null : data;
}

/** Club manager: view the club's current join code — auto-rotates server-side if it's gone stale (>24h) */
export async function loadJoinCode(): Promise<JoinCodeInfo> {
  const { data, error } = await supabase.rpc("my_club_join_code");
  if (error) throw new Error(`loadJoinCode: ${error.message}`);
  const row = toRow<{ code: string; rotated_at: string; expires_at: string }>(data);
  if (!row) throw new Error("loadJoinCode: couldn't find your club");
  return { code: row.code, rotatedAt: row.rotated_at, expiresAt: row.expires_at };
}

/** Club manager: force-rotate the code immediately, before its 24h window is up */
export async function regenerateJoinCode(): Promise<JoinCodeInfo> {
  const { data, error } = await supabase.rpc("regenerate_my_club_join_code");
  if (error) throw new Error(`regenerateJoinCode: ${error.message}`);
  const row = toRow<{ code: string; rotated_at: string; expires_at: string }>(data);
  if (!row) throw new Error("regenerateJoinCode: couldn't find your club");
  return { code: row.code, rotatedAt: row.rotated_at, expiresAt: row.expires_at };
}

export interface JoinCodeValidation {
  is_valid: boolean;
  club_id: string | null;
  club_name: string | null;
}

/**
 * Checks whether a code is currently valid, and which club it belongs to.
 * Callable while signed out (RPC is granted to the `anon` role) — this is
 * how the /register page checks a code before showing the sign-up form.
 */
export async function validateJoinCode(code: string): Promise<JoinCodeValidation | null> {
  const { data, error } = await supabase.rpc("validate_join_code", { p_code: code });
  if (error) throw new Error(`validateJoinCode: ${error.message}`);
  const row = toRow<JoinCodeValidation>(data);
  if (!row) return null;
  return row;
}
