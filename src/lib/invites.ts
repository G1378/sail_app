import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/useProfile";

export interface ClubInvite {
  id: string;
  token: string;
  role: UserRole;
  invitee_name: string | null;
  created_by: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
}

/** Load every invite the club manager has ever created (RLS restricts this to club managers) */
export async function loadInvites(): Promise<ClubInvite[]> {
  const { data, error } = await supabase
    .from("club_invites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`loadInvites: ${error.message}`);
  return data as ClubInvite[];
}

/** Create a new single-use, role-preassigned invite link. Club manager only (enforced by RLS). */
export async function createInvite(
  role: UserRole,
  inviteeName: string,
  expiresInDays = 14
): Promise<ClubInvite> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // Random URL-safe token — doesn't rely on any particular Postgres extension
  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("club_invites")
    .insert({
      token,
      role,
      invitee_name: inviteeName.trim() || null,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw new Error(`createInvite: ${error.message}`);
  return data as ClubInvite;
}

/** Revoke an invite before it's used (or clean up an old one) */
export async function revokeInvite(id: string): Promise<void> {
  const { error } = await supabase.from("club_invites").delete().eq("id", id);
  if (error) throw new Error(`revokeInvite: ${error.message}`);
}

export interface InviteValidation {
  is_valid: boolean;
  invite_role: UserRole;
  invitee_name: string | null;
  club_name: string | null;
}

/**
 * Check whether an invite token is still usable, and what role/name it carries.
 * Callable while signed out (RPC is granted to the `anon` role) — this is how the
 * /register page checks a link before showing the sign-up form.
 */
export async function validateInvite(token: string): Promise<InviteValidation | null> {
  const { data, error } = await supabase.rpc("validate_invite", { invite_token: token });
  if (error) throw new Error(`validateInvite: ${error.message}`);
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  return (Array.isArray(data) ? data[0] : data) as InviteValidation;
}
