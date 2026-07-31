"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { AppNav } from "@/components/AppNav";
import {
  loadSessions,
  loadSignups,
  createSession,
  updateSessionStatus,
  deleteSession,
  getSignupState,
  type Session,
  type SessionSignup,
  type SessionStatus,
} from "@/lib/sessions";

// ── Helpers ────────────────────────────────────────────────────

function statusColour(status: SessionStatus) {
  return {
    draft:     "bg-gray-100 text-gray-600",
    open:      "bg-green-100 text-green-700",
    closed:    "bg-amber-100 text-amber-700",
    completed: "bg-blue-100 text-blue-700",
  }[status];
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ── Create session form ────────────────────────────────────────

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const todayDate = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    title: "",
    date: todayDate,
    signup_opens_at_date:  todayDate,
    signup_opens_at_time:  "08:00",
    signup_closes_at_date: todayDate,
    signup_closes_at_time: "10:00",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const opens  = new Date(`${form.signup_opens_at_date}T${form.signup_opens_at_time}`);
    const closes = new Date(`${form.signup_closes_at_date}T${form.signup_closes_at_time}`);

    if (closes <= opens) {
      setError("Sign-off time must be after sign-on time.");
      return;
    }

    setSaving(true);
    try {
      await createSession({
        title:            form.title,
        date:             form.date,
        signup_opens_at:  opens.toISOString(),
        signup_closes_at: closes.toISOString(),
        status:           "draft",
        notes:            form.notes,
      });
      setOpen(false);
      setForm({ title: "", date: todayDate, signup_opens_at_date: todayDate, signup_opens_at_time: "08:00", signup_closes_at_date: todayDate, signup_closes_at_time: "10:00", notes: "" });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        + New Session
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">New Session</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Session title</label>
          <input
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Saturday Morning — Trapeze Focus"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Session date</label>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Sign-on opens</label>
            <input type="date" value={form.signup_opens_at_date} onChange={(e) => set("signup_opens_at_date", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mb-2 focus:border-blue-400 focus:outline-none" />
            <input type="time" value={form.signup_opens_at_time} onChange={(e) => set("signup_opens_at_time", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Sign-on closes</label>
            <input type="date" value={form.signup_closes_at_date} onChange={(e) => set("signup_closes_at_date", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mb-2 focus:border-blue-400 focus:outline-none" />
            <input type="time" value={form.signup_closes_at_time} onChange={(e) => set("signup_closes_at_time", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Any extra info for sailors..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? "Creating…" : "Create Session"}
        </button>
      </form>
    </div>
  );
}

// ── Session card ───────────────────────────────────────────────

function SessionCard({ session, onRefresh }: { session: Session; onRefresh: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signups, setSignups] = useState<SessionSignup[]>([]);
  const [signupsLoading, setSignupsLoading] = useState(true);
  const signupState = getSignupState(session);

  useEffect(() => {
    loadSignups(session.id)
      .then(setSignups)
      .catch(() => {})
      .finally(() => setSignupsLoading(false));
  }, [session.id]);

  async function handleDelete() {
    await deleteSession(session.id);
    onRefresh();
  }

  async function handleStatusChange(status: SessionStatus) {
    await updateSessionStatus(session.id, status);
    onRefresh();
  }

  function copyInviteLink() {
    const url = `${window.location.origin}/signup/${session.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // Most recent 5 sign-ups, newest first (loadSignups returns oldest-first)
  const recentSignups = [...signups].reverse().slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/sessions/${session.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            {session.title}
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(session.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColour(session.status)}`}>
          {session.status}
        </span>
      </div>

      <div className="flex flex-col gap-1 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${signupState === "open" ? "bg-green-500" : signupState === "before" ? "bg-amber-400" : "bg-gray-300"}`} />
          Sign-on opens: <span className="font-medium text-gray-700">{fmt(session.signup_opens_at)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
          Sign-on closes: <span className="font-medium text-gray-700">{fmt(session.signup_closes_at)}</span>
        </div>
      </div>

      {session.notes && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{session.notes}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link
          href={`/sessions/${session.id}`}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          👥 Manage sign-ups
        </Link>

        <Link
          href={`/planner?session=${session.id}`}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          ⛵ Fleet Planner
        </Link>

        <button
          onClick={copyInviteLink}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            copied
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          }`}
        >
          {copied ? "✓ Copied!" : "🔗 Copy invite link"}
        </button>

        {session.status === "draft" && (
          <button
            onClick={() => handleStatusChange("open")}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
          >
            Publish
          </button>
        )}
        {session.status === "open" && (
          <button
            onClick={() => handleStatusChange("closed")}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
          >
            Close sign-ups
          </button>
        )}
        {session.status === "closed" && (
          <button
            onClick={() => handleStatusChange("completed")}
            className="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition-colors"
          >
            Mark complete
          </button>
        )}

        {confirming ? (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">Delete?</span>
            <button onClick={handleDelete} className="text-xs font-medium text-red-600 hover:underline">Yes</button>
            <button onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:underline">No</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="ml-auto text-xs text-gray-300 hover:text-red-400 transition-colors">
            Delete
          </button>
        )}
      </div>

      {/* Recent sign-ups summary */}
      <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
        <div className="flex flex-shrink-0 items-center gap-1.5 text-gray-500">
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{signups.length}</span>
        </div>
        <div className="h-4 w-px flex-shrink-0 bg-gray-200" />
        {signupsLoading ? (
          <span className="text-xs text-gray-400">Loading…</span>
        ) : recentSignups.length === 0 ? (
          <span className="text-xs text-gray-400">No sign-ups yet</span>
        ) : (
          <p className="truncate text-xs text-gray-500">
            {recentSignups.map((s) => s.sailor_profiles?.name ?? "Unknown").join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Read-only card (sailors / instructors / club managers) ──────

function ReadOnlySessionCard({ session, signUpDirectly }: { session: Session; signUpDirectly?: boolean }) {
  const [copied, setCopied] = useState(false);

  function copyInviteLink() {
    const url = `${window.location.origin}/signup/${session.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (signUpDirectly) {
    return (
      <Link
        href={`/signup/${session.id}`}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between gap-3 hover:border-blue-300 hover:shadow-md transition-all"
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{session.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(session.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <span className="flex-shrink-0 text-xs font-semibold text-blue-600">
          Sign up →
        </span>
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{session.title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(session.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>
      <button
        onClick={copyInviteLink}
        className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
          copied
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
        }`}
      >
        {copied ? "✓ Copied!" : "🔗 Copy invite link"}
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function SessionsPage() {
  const { profile, loading: profileLoading } = useProfile({
    requireAuth: "/login",
    requireRole: ["senior_instructor", "instructor", "sailor", "club_manager"],
    redirectIfUnauthorised: "/planner",
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const isSeniorInstructor = profile?.user_role === "senior_instructor";

  async function refresh() {
    const data = await loadSessions();
    setSessions(data);
  }

  useEffect(() => {
    if (profileLoading || !profile) return;
    loadSessions().then((data) => {
      setSessions(data);
      setLoading(false);
    });
  }, [profileLoading, profile]);

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-3xl animate-bounce">⛵</span>
      </div>
    );
  }

  const upcoming  = sessions.filter((s) => s.status !== "completed");
  const completed = sessions.filter((s) => s.status === "completed");
  const isSailor = profile.user_role === "sailor";
  // Non-senior-instructors only need to see open sessions — enough to sign up or grab a link
  const visibleUpcoming = isSeniorInstructor ? upcoming : upcoming.filter((s) => s.status === "open");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppNav profile={profile} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sessions</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {isSeniorInstructor
                ? "Create and manage sailor sign-up sessions."
                : isSailor
                ? "Tap an open session to sign yourself up."
                : "Grab the sign-up link for an open session."}
            </p>
          </div>
          {isSeniorInstructor && <CreateForm onCreated={refresh} />}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <span className="text-3xl animate-bounce mr-3">⛵</span>
            <span className="text-sm">Loading…</span>
          </div>
        ) : isSeniorInstructor ? (
          <div className="flex flex-col gap-8">
            {upcoming.length > 0 ? (
              <div className="flex flex-col gap-3">
                {upcoming.map((s) => (
                  <SessionCard key={s.id} session={s} onRefresh={refresh} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
                No upcoming sessions yet — create one above.
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Completed</p>
                <div className="flex flex-col gap-3">
                  {completed.map((s) => (
                    <SessionCard key={s.id} session={s} onRefresh={refresh} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleUpcoming.length > 0 ? (
              visibleUpcoming.map((s) => (
                <ReadOnlySessionCard key={s.id} session={s} signUpDirectly={isSailor} />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
                No open sessions right now.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
