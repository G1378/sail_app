"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { loadSession, loadSignups, getSignupState, type Session, type SessionSignup } from "@/lib/sessions";
import { loadBoats } from "@/lib/db";
import type { Boat } from "@/types";

// ── Countdown ────────────────────────────────────────────────

function useCountdown(target: string) {
  const [diff, setDiff] = useState(0);

  useEffect(() => {
    function tick() {
      setDiff(Math.max(0, new Date(target).getTime() - Date.now()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const totalSeconds = Math.floor(diff / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, done: diff === 0 };
}

function CountdownDisplay({ target }: { target: string }) {
  const { hours, minutes, seconds, done } = useCountdown(target);

  if (done) return null;

  return (
    <div className="flex items-center justify-center gap-3 my-6">
      {[
        { value: hours,   label: "hrs"  },
        { value: minutes, label: "min"  },
        { value: seconds, label: "sec"  },
      ].map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white tabular-nums">
              {String(value).padStart(2, "0")}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Focus options ────────────────────────────────────────────

const FOCUS_OPTIONS = [
  "Tacking & Gybing",
  "Spinnaker",
  "Trapeze",
  "Race starts",
  "Mark rounding",
  "Boat handling",
  "Capsize recovery",
  "Rules of Racing",
  "General sailing",
];

// ── Main page ─────────────────────────────────────────────────

export default function SignupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession]       = useState<Session | null>(null);
  const [boats, setBoats]           = useState<Boat[]>([]);
  const [existingSignup, setExistingSignup] = useState<SessionSignup | null>(null);
  const [userId, setUserId]         = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);
  const [focusGoal, setFocusGoal]           = useState("");

  // Poll every 10s to auto-open when countdown hits zero
  const [signupState, setSignupState] = useState<"before" | "open" | "closed">("before");

  const refresh = useCallback(async () => {
    if (!session) return;
    setSignupState(getSignupState(session));
  }, [session]);

  useEffect(() => {
    const id_ = setInterval(refresh, 10000);
    return () => clearInterval(id_);
  }, [refresh]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/login`); return; }
      setUserId(user.id);

      // Load profile name
      const { data: profile } = await supabase
        .from("sailor_profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      if (profile) setProfileName(profile.name);

      const [s, allBoats, allSignups] = await Promise.all([
        loadSession(id),
        loadBoats(),
        loadSignups(id),
      ]);

      setSession(s);
      setBoats(allBoats);
      setSignupState(getSignupState(s));

      // Check if already signed up
      const mine = allSignups.find((su) => su.sailor_profile_id === user.id);
      if (mine) {
        setExistingSignup(mine);
        setSelectedBoatId(mine.preferred_boat_id ?? null);
        setFocusGoal(mine.focus_goal ?? "");
      }

      setLoading(false);
    }
    load().catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, [id, router]);

  // Update signupState reactively when session loads
  useEffect(() => {
    if (session) setSignupState(getSignupState(session));
  }, [session]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !session) return;
    setSaving(true);
    setError("");

    const payload = {
      session_id:        session.id,
      sailor_profile_id: userId,
      preferred_boat_id: selectedBoatId ?? null,
      focus_goal:        focusGoal,
    };

    const { error: upsertError } = existingSignup
      ? await supabase.from("session_signups").update({
          preferred_boat_id: payload.preferred_boat_id,
          focus_goal:        payload.focus_goal,
        }).eq("id", existingSignup.id)
      : await supabase.from("session_signups").insert(payload);

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setSuccess(true);
  }

  async function handleWithdraw() {
    if (!existingSignup) return;
    setSaving(true);
    await supabase.from("session_signups").delete().eq("id", existingSignup.id);
    setExistingSignup(null);
    setSuccess(false);
    setSaving(false);
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-4xl animate-bounce">⛵</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Session not found.</p>
      </div>
    );
  }

  const sessionDate = new Date(session.date).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });

  // ── Success screen ──
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You're signed up!</h1>
        <p className="text-sm text-gray-500 mb-2">{session.title}</p>
        <p className="text-sm text-gray-500 mb-6">{sessionDate}</p>
        {selectedBoatId && (
          <p className="text-sm text-gray-600 mb-1">
            Preferred boat: <span className="font-medium">{boats.find((b) => b.id === selectedBoatId)?.name}</span>
          </p>
        )}
        {focusGoal && (
          <p className="text-sm text-gray-600 mb-6">
            Focus: <span className="font-medium">{focusGoal}</span>
          </p>
        )}
        <button
          onClick={handleWithdraw}
          disabled={saving}
          className="text-xs text-red-400 hover:text-red-600 mt-4"
        >
          Withdraw from session
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-100 bg-white px-5 py-4 flex items-center gap-2">
        <span className="text-xl">⛵</span>
        <span className="text-sm font-semibold text-gray-900">Session Sign-up</span>
        <div className="ml-auto flex items-center gap-3">
          {profileName && <span className="text-xs text-gray-400">{profileName}</span>}
          <Link href="/profile" className="text-xs text-gray-500 hover:text-gray-700">Profile</Link>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8">
        {/* Session info card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
          <h1 className="text-lg font-bold text-gray-900">{session.title}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{sessionDate}</p>
          {session.notes && (
            <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-lg px-3 py-2">{session.notes}</p>
          )}
        </div>

        {/* ── BEFORE: countdown ── */}
        {signupState === "before" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
            <p className="text-sm font-semibold text-gray-700 mb-1">Sign-up opens in</p>
            <CountdownDisplay target={session.signup_opens_at} />
            <p className="text-xs text-gray-400">
              Opens {new Date(session.signup_opens_at).toLocaleString("en-GB", {
                weekday: "long", hour: "2-digit", minute: "2-digit",
              })}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Closes {new Date(session.signup_closes_at).toLocaleString("en-GB", {
                weekday: "long", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        )}

        {/* ── CLOSED ── */}
        {signupState === "closed" && !existingSignup && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
            <div className="text-3xl mb-3">🔒</div>
            <p className="text-sm font-semibold text-gray-700">Sign-up is now closed</p>
            <p className="text-xs text-gray-400 mt-1">Speak to your instructor if you still need to join.</p>
          </div>
        )}

        {/* ── OPEN or already signed up ── */}
        {(signupState === "open" || existingSignup) && (
          <form onSubmit={handleSignup} className="flex flex-col gap-6">
            {existingSignup && (
              <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700 font-medium">
                ✓ You're signed up — you can update your preferences below.
              </div>
            )}

            {/* Boat picker */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Preferred boat <span className="text-gray-300 font-normal normal-case">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBoatId(null)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all ${
                    !selectedBoatId
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-700">No preference</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Let the instructor decide</p>
                </button>

                {boats.map((boat) => (
                  <button
                    key={boat.id}
                    type="button"
                    onClick={() => setSelectedBoatId(boat.id)}
                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                      selectedBoatId === boat.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-700">{boat.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{boat.type}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Focus picker */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                What do you want to focus on? <span className="text-gray-300 font-normal normal-case">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFocusGoal(focusGoal === opt ? "" : opt)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      focusGoal === opt
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {focusGoal === opt ? "✓ " : ""}{opt}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={FOCUS_OPTIONS.includes(focusGoal) ? "" : focusGoal}
                onChange={(e) => setFocusGoal(e.target.value)}
                placeholder="Or type your own…"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : existingSignup ? "Update sign-up" : "Sign up for session"}
            </button>

            {existingSignup && (
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={saving}
                className="w-full text-center text-xs text-red-400 hover:text-red-600"
              >
                Withdraw from session
              </button>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
