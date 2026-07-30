import { supabase } from "@/lib/supabase";

export type SessionStatus = "draft" | "open" | "closed" | "completed";

export interface Session {
  id: string;
  title: string;
  date: string;
  signup_opens_at: string;
  signup_closes_at: string;
  status: SessionStatus;
  notes: string;
  created_by: string | null;
}

export interface SessionSignup {
  id: string;
  session_id: string;
  sailor_profile_id: string;
  preferred_boat_type: string | null;
  focus_goal: string;
  signed_up_at: string;
  sailor_profiles?: { name: string; stage: string; role: string; confidence: string };
}

export async function loadSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return data as Session[];
}

export async function loadSession(id: string): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Session;
}

export async function loadSignups(sessionId: string): Promise<SessionSignup[]> {
  const { data, error } = await supabase
    .from("session_signups")
    .select(`
      *,
      sailor_profiles (name, stage, role, confidence)
    `)
    .eq("session_id", sessionId)
    .order("signed_up_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as SessionSignup[];
}

export async function createSession(session: Omit<Session, "id" | "created_at" | "created_by">): Promise<Session> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ ...session, created_by: user?.id ?? null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Session;
}

export async function updateSessionStatus(id: string, status: SessionStatus): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function getSignupState(session: Session): "before" | "open" | "closed" {
  const now = new Date();
  const opens  = new Date(session.signup_opens_at);
  const closes = new Date(session.signup_closes_at);
  if (now < opens)  return "before";
  if (now > closes) return "closed";
  return "open";
}

// ── "My sessions" — used by the role-specific profile portal pages ──

function normaliseJoinedSession(raw: Session | Session[] | null | undefined): Session | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

export interface MySailorSignup {
  id: string;
  session: Session;
}

export async function loadMySailorSignups(userId: string): Promise<MySailorSignup[]> {
  const { data, error } = await supabase
    .from("session_signups")
    .select(`id, sessions (*)`)
    .eq("sailor_profile_id", userId);
  if (error) throw new Error(error.message);
  return (data as { id: string; sessions: Session | Session[] | null }[])
    .map((row) => ({ id: row.id, session: normaliseJoinedSession(row.sessions) }))
    .filter((row): row is MySailorSignup => row.session !== null);
}

export async function cancelSailorSignup(signupId: string): Promise<void> {
  const { error } = await supabase.from("session_signups").delete().eq("id", signupId);
  if (error) throw new Error(error.message);
}

export interface MyInstructorSignup {
  id: string;
  session: Session;
}

export async function loadMyInstructorSignups(userId: string): Promise<MyInstructorSignup[]> {
  const { data, error } = await supabase
    .from("instructor_signups")
    .select(`id, sessions (*)`)
    .eq("sailor_profile_id", userId);
  if (error) throw new Error(error.message);
  return (data as { id: string; sessions: Session | Session[] | null }[])
    .map((row) => ({ id: row.id, session: normaliseJoinedSession(row.sessions) }))
    .filter((row): row is MyInstructorSignup => row.session !== null);
}

export async function cancelInstructorSignup(signupId: string): Promise<void> {
  const { error } = await supabase.from("instructor_signups").delete().eq("id", signupId);
  if (error) throw new Error(error.message);
}
