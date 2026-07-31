"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { AppNav } from "@/components/AppNav";
import { loadInstructorsFromSession } from "@/lib/db";
import { AddSailorBox } from "@/components/AddSailorBox";
import {
  loadSession,
  loadSignups,
  updateSessionStatus,
  getSignupState,
  removeSignup,
  type Session,
  type SessionSignup,
  type SessionStatus,
} from "@/lib/sessions";

function statusColour(status: SessionStatus) {
  return {
    draft:     "bg-gray-100 text-gray-600",
    open:      "bg-green-100 text-green-700",
    closed:    "bg-amber-100 text-amber-700",
    completed: "bg-blue-100 text-blue-700",
  }[status];
}

function stageLabel(stage: string) {
  return { "1": "Stage 1", "2": "Stage 2", "3": "Stage 3", "4": "Stage 4" }[stage] ?? stage;
}

// ── Share link box ─────────────────────────────────────────────

function ShareBox({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/signup/${sessionId}`
    : `/signup/${sessionId}`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
      <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
        📋 Sailor sign-up link — share this
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-xl bg-white border border-blue-200 px-3 py-2 text-xs text-blue-900 font-mono break-all select-all">
          {url}
        </div>
        <button
          onClick={copy}
          className={`flex-shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            copied
              ? "bg-green-500 text-white"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-[10px] text-blue-500 mt-2">
        Paste into WhatsApp, email, or any group chat. Sailors tap the link to sign up.
      </p>
    </div>
  );
}

// ── Signed-up sailor card ─────────────────────────────────────────

function SignupCard({ signup, onRemoved }: { signup: SessionSignup; onRemoved: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setRemoving(true);
    try {
      await removeSignup(signup.id);
      onRemoved(signup.id);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">
              {signup.sailor_profiles?.name ?? "Unknown"}
            </p>
            {signup.added_by_instructor && (
              <span className="rounded-full bg-purple-50 border border-purple-100 px-2 py-0.5 text-[9px] font-medium text-purple-600 uppercase tracking-wide">
                Added by instructor
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              {stageLabel(signup.sailor_profiles?.stage ?? "")}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              {signup.sailor_profiles?.role}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              {signup.sailor_profiles?.confidence} confidence
            </span>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 flex-shrink-0">
          {new Date(signup.signed_up_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {(signup.preferred_boat_type || signup.focus_goal) && (
        <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-3 text-xs text-gray-500">
          {signup.preferred_boat_type && (
            <span>Preferred boat: <span className="font-medium text-gray-700">{signup.preferred_boat_type}</span></span>
          )}
          {signup.focus_goal && (
            <span>Focus: <span className="font-medium text-gray-700">{signup.focus_goal}</span></span>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
        <button
          onClick={handleRemove}
          disabled={removing}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60 ${
            confirming ? "bg-red-600 text-white hover:bg-red-700" : "text-red-400 hover:bg-red-50"
          }`}
        >
          {removing ? "Removing…" : confirming ? "Confirm removal" : "Remove"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [signups, setSignups] = useState<SessionSignup[]>([]);
  const [instructorNames, setInstructorNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const { profile, loading: profileLoading } = useProfile({
    requireAuth: "/login",
    requireRole: ["senior_instructor"],
    redirectIfUnauthorised: "/planner",
  });

  const refresh = useCallback(async () => {
    try {
      const [s, su, ins] = await Promise.all([
        loadSession(id),
        loadSignups(id),
        loadInstructorsFromSession(id),
      ]);
      setSession(s);
      setSignups(su);
      setInstructorNames(ins);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    if (profileLoading || !profile) return;
    refresh().finally(() => setLoading(false));
  }, [refresh, profileLoading, profile]);

  // Auto-refresh signups every 15s while page is open
  useEffect(() => {
    if (!profile) return;
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh, profile]);

  if (profileLoading || !profile || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-3xl animate-bounce">⛵</span>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-4">{error || "Session not found"}</p>
          <Link href="/sessions" className="text-sm text-blue-600 hover:underline">← Back to sessions</Link>
        </div>
      </div>
    );
  }

  const signupState = getSignupState(session);
  const signupsByRole = {
    Helm:   signups.filter((s) => s.sailor_profiles?.role === "Helm"),
    Crew:   signups.filter((s) => s.sailor_profiles?.role === "Crew"),
    Either: signups.filter((s) => s.sailor_profiles?.role === "Either"),
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppNav profile={profile} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-5">
        <Link href="/sessions" className="text-xs text-gray-500 hover:text-gray-700 font-medium -mb-1">
          ← Back to sessions
        </Link>

        {/* Session info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{session.title}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {new Date(session.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColour(session.status)}`}>
              {session.status}
            </span>
          </div>

          <div className="flex flex-col gap-1 text-xs text-gray-500 mb-4">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${signupState === "open" ? "bg-green-500" : signupState === "before" ? "bg-amber-400" : "bg-gray-300"}`} />
              Sign-on opens: <span className="font-medium text-gray-700">{new Date(session.signup_opens_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
              Sign-on closes: <span className="font-medium text-gray-700">{new Date(session.signup_closes_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          {session.notes && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-4">{session.notes}</p>
          )}

          {/* Status actions */}
          <div className="flex flex-wrap gap-2">
            {session.status === "draft" && (
              <button onClick={() => { updateSessionStatus(id, "open"); refresh(); }}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">
                Publish session
              </button>
            )}
            {session.status === "open" && (
              <button onClick={() => { updateSessionStatus(id, "closed"); refresh(); }}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors">
                Close sign-ups
              </button>
            )}
            {session.status === "closed" && (
              <button onClick={() => { updateSessionStatus(id, "completed"); refresh(); }}
                className="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition-colors">
                Mark complete
              </button>
            )}
          </div>
        </div>

        {/* Share link — prominent */}
        <ShareBox sessionId={id} />

        {/* Open in planner button */}
        {(signups.length > 0 || instructorNames.length > 0) && (
          <Link
            href={`/planner?session=${id}`}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            ⛵ Open Fleet Planner — {signups.length} sailor{signups.length !== 1 ? "s" : ""}, {instructorNames.length} instructor{instructorNames.length !== 1 ? "s" : ""} →
          </Link>
        )}

        {/* Instructors signed up */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Instructors attending <span className="text-gray-400 font-normal">({instructorNames.length})</span>
          </h2>
          {instructorNames.length === 0 ? (
            <p className="text-sm text-gray-400">No instructors have marked attendance yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {instructorNames.map((name) => (
                <span key={name} className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sign-ups list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Signed up <span className="text-gray-400 font-normal">({signups.length})</span>
            </h2>
            <button onClick={refresh} className="text-xs text-gray-400 hover:text-gray-600">↻ Refresh</button>
          </div>

          <div className="flex flex-col gap-3">
            <AddSailorBox sessionId={id} onAdded={refresh} />

            {signups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
                No sailors signed up yet.
              </div>
            ) : (
              signups.map((signup) => (
                <SignupCard
                  key={signup.id}
                  signup={signup}
                  onRemoved={(removedId) => setSignups((cur) => cur.filter((s) => s.id !== removedId))}
                />
              ))
            )}
          </div>
        </div>

        {/* Role summary */}
        {signups.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Summary by role</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              {(["Helm", "Crew", "Either"] as const).map((role) => (
                <div key={role} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-gray-900">{signupsByRole[role].length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{role}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
