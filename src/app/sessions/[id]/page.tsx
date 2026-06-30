"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import {
  loadSession,
  loadSignups,
  updateSessionStatus,
  getSignupState,
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

// ── Main page ──────────────────────────────────────────────────

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [signups, setSignups] = useState<SessionSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const { profile, loading: profileLoading } = useProfile({
    requireAuth: "/login",
    requireRole: ["senior_instructor"],
    redirectIfUnauthorised: "/",
  });

  const refresh = useCallback(async () => {
    try {
      const [s, su] = await Promise.all([loadSession(id), loadSignups(id)]);
      setSession(s);
      setSignups(su);
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
      <header className="border-b border-gray-100 bg-white px-5 py-4 flex items-center gap-3">
        <Link href="/" className="text-xl">⛵</Link>
        <span className="text-sm font-semibold text-gray-900">Session Detail</span>
        <div className="ml-auto">
          <Link href="/sessions" className="text-xs text-gray-500 hover:text-gray-700 font-medium">← Sessions</Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-5">

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
            {(session.status === "open" || session.status === "closed") && (
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
        {signups.length > 0 && (
          <Link
            href={`/?session=${id}`}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            ⛵ Open Fleet Planner with these {signups.length} sailors →
          </Link>
        )}

        {/* Sign-ups list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Signed up <span className="text-gray-400 font-normal">({signups.length})</span>
            </h2>
            <button onClick={refresh} className="text-xs text-gray-400 hover:text-gray-600">↻ Refresh</button>
          </div>

          {signups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
              No sailors signed up yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {signups.map((signup) => (
                <div key={signup.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {signup.sailor_profiles?.name ?? "Unknown"}
                      </p>
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
                  {(signup.boats || signup.focus_goal) && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-3 text-xs text-gray-500">
                      {signup.boats && (
                        <span>Preferred boat: <span className="font-medium text-gray-700">{signup.boats.name} ({signup.boats.type})</span></span>
                      )}
                      {signup.focus_goal && (
                        <span>Focus: <span className="font-medium text-gray-700">{signup.focus_goal}</span></span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
