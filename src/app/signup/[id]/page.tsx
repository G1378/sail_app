"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadSession, getSignupState, type Session } from "@/lib/sessions";
import { loadBoats } from "@/lib/db";
import { useProfile } from "@/lib/useProfile";
import { AppNav } from "@/components/AppNav";
import type { Boat } from "@/types";

// ── Countdown ─────────────────────────────────────────────────

function useCountdown(target: string) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    function tick() { setDiff(Math.max(0, new Date(target).getTime() - Date.now())); }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  const total = Math.floor(diff / 1000);
  return {
    hours:   Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: diff === 0,
  };
}

function CountdownDisplay({ target }: { target: string }) {
  const { hours, minutes, seconds, done } = useCountdown(target);
  if (done) return null;
  return (
    <div className="flex items-center justify-center gap-3 my-6">
      {[{ value: hours, label: "hrs" }, { value: minutes, label: "min" }, { value: seconds, label: "sec" }].map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white tabular-nums">{String(value).padStart(2, "0")}</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">{label}</span>
        </div>
      ))}
    </div>
  );
}

const FOCUS_OPTIONS = [
  "Tacking & Gybing", "Spinnaker", "Trapeze", "Race starts",
  "Mark rounding", "Boat handling", "Capsize recovery", "Rules of Racing", "General sailing",
];

// ── Instructor sign-up (just attendance) ──────────────────────

function InstructorSignup({ session, userId, profileName }: { session: Session; userId: string; profileName: string }) {
  const [attending, setAttending]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const signupState                 = getSignupState(session);

  useEffect(() => {
    supabase.from("instructor_signups")
      .select("id").eq("session_id", session.id).eq("sailor_profile_id", userId).maybeSingle()
      .then(({ data }) => { setAttending(!!data); setLoading(false); });
  }, [session.id, userId]);

  async function toggle() {
    setSaving(true);
    if (attending) {
      await supabase.from("instructor_signups")
        .delete().eq("session_id", session.id).eq("sailor_profile_id", userId);
      setAttending(false);
    } else {
      await supabase.from("instructor_signups")
        .insert({ session_id: session.id, sailor_profile_id: userId });
      setAttending(true);
    }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-10"><span className="text-3xl animate-bounce">⛵</span></div>;

  return (
    <div className="flex flex-col gap-5">
      {signupState === "before" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-1">Session opens in</p>
          <CountdownDisplay target={session.signup_opens_at} />
          <p className="text-xs text-gray-400">You can still mark attendance in advance.</p>
        </div>
      )}

      {signupState === "closed" && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-700 font-medium">
          Sign-up window has closed.
        </div>
      )}

      <div className={`rounded-2xl border-2 p-6 text-center transition-all ${attending ? "border-green-400 bg-green-50" : "border-gray-200 bg-white"}`}>
        <div className="text-4xl mb-3">{attending ? "✅" : "🤔"}</div>
        <p className="text-base font-semibold text-gray-900 mb-1">
          {attending ? "You're marked as attending" : "Are you coming to this session?"}
        </p>
        <p className="text-xs text-gray-400 mb-5">
          {attending ? "You'll appear in the instructor pool on the planning board." : "Tap below to mark your attendance."}
        </p>
        <button onClick={toggle} disabled={saving}
          className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
            attending ? "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
            : "bg-blue-600 text-white hover:bg-blue-700"
          }`}>
          {saving ? "Saving…" : attending ? "Withdraw attendance" : `Yes, I'm coming`}
        </button>
      </div>
    </div>
  );
}

// ── Sailor sign-up (boat + focus) ─────────────────────────────

function SailorSignup({ session, userId, profileName }: { session: Session; userId: string; profileName: string }) {
  const [boats, setBoats]               = useState<Boat[]>([]);
  const [existingSignupId, setExistingSignupId] = useState<string | null>(null);
  const [selectedBoatId, setSelectedBoatId]     = useState<string | null>(null);
  const [focusGoal, setFocusGoal]               = useState("");
  const [loading, setLoading]                   = useState(true);
  const [saving, setSaving]                     = useState(false);
  const [success, setSuccess]                   = useState(false);
  const [error, setError]                       = useState("");

  const signupState = getSignupState(session);

  // Poll every 10s to auto-open when countdown hits zero
  const [liveState, setLiveState] = useState(signupState);
  useEffect(() => {
    const t = setInterval(() => setLiveState(getSignupState(session)), 10000);
    return () => clearInterval(t);
  }, [session]);

  useEffect(() => {
    async function load() {
      const [allBoats, existing] = await Promise.all([
        loadBoats(),
        supabase.from("session_signups")
          .select("id, preferred_boat_id, focus_goal")
          .eq("session_id", session.id).eq("sailor_profile_id", userId).maybeSingle(),
      ]);
      setBoats(allBoats);
      if (existing.data) {
        setExistingSignupId(existing.data.id);
        setSelectedBoatId(existing.data.preferred_boat_id ?? null);
        setFocusGoal(existing.data.focus_goal ?? "");
        setSuccess(true);
      }
      setLoading(false);
    }
    load().catch((err) => { setError(err.message); setLoading(false); });
  }, [session.id, userId]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const payload = { session_id: session.id, sailor_profile_id: userId, preferred_boat_id: selectedBoatId, focus_goal: focusGoal };
    const { error: err } = existingSignupId
      ? await supabase.from("session_signups").update({ preferred_boat_id: selectedBoatId, focus_goal: focusGoal }).eq("id", existingSignupId)
      : await supabase.from("session_signups").insert(payload).select().single().then(({ data, error }) => {
          if (data) setExistingSignupId(data.id);
          return { error };
        });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
  }

  async function handleWithdraw() {
    if (!existingSignupId) return;
    setSaving(true);
    await supabase.from("session_signups").delete().eq("id", existingSignupId);
    setExistingSignupId(null); setSuccess(false); setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-10"><span className="text-3xl animate-bounce">⛵</span></div>;

  if (success) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
      <div className="text-4xl mb-3">🎉</div>
      <p className="text-base font-semibold text-gray-900 mb-1">You're signed up!</p>
      {selectedBoatId && <p className="text-xs text-gray-500 mt-1">Preferred boat: <span className="font-medium">{boats.find((b) => b.id === selectedBoatId)?.name}</span></p>}
      {focusGoal && <p className="text-xs text-gray-500 mt-0.5">Focus: <span className="font-medium">{focusGoal}</span></p>}
      <div className="flex flex-col gap-2 mt-5">
        <button onClick={() => setSuccess(false)}
          className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Edit preferences
        </button>
        <button onClick={handleWithdraw} disabled={saving}
          className="w-full text-xs text-red-400 hover:text-red-600 py-2">
          Withdraw from session
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSignup} className="flex flex-col gap-6">
      {liveState === "before" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-1">Sign-up opens in</p>
          <CountdownDisplay target={session.signup_opens_at} />
          <p className="text-xs text-gray-400">Opens {new Date(session.signup_opens_at).toLocaleString("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      )}

      {liveState === "closed" && !existingSignupId && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
          <div className="text-3xl mb-3">🔒</div>
          <p className="text-sm font-semibold text-gray-700">Sign-up is now closed</p>
          <p className="text-xs text-gray-400 mt-1">Speak to your instructor if you still need to join.</p>
        </div>
      )}

      {liveState === "open" && (
        <>
          {existingSignupId && (
            <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700 font-medium">
              ✓ You're signed up — update your preferences below.
            </div>
          )}

          {/* Boat picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              Preferred boat <span className="text-gray-300 font-normal normal-case">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSelectedBoatId(null)}
                className={`rounded-xl border px-3 py-3 text-left transition-all ${!selectedBoatId ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                <p className="text-xs font-semibold text-gray-700">No preference</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Let the instructor decide</p>
              </button>
              {boats.map((boat) => (
                <button key={boat.id} type="button" onClick={() => setSelectedBoatId(boat.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all ${selectedBoatId === boat.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
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
                <button key={opt} type="button" onClick={() => setFocusGoal(focusGoal === opt ? "" : opt)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    focusGoal === opt ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}>
                  {focusGoal === opt ? "✓ " : ""}{opt}
                </button>
              ))}
            </div>
            <input type="text" value={FOCUS_OPTIONS.includes(focusGoal) ? "" : focusGoal}
              onChange={(e) => setFocusGoal(e.target.value)} placeholder="Or type your own…"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>

          {error && <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? "Saving…" : existingSignupId ? "Update sign-up" : "Sign up for session"}
          </button>
        </>
      )}
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function SignupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile({ requireAuth: "/login" });

  const [session, setSession]   = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    loadSession(id)
      .then(setSession)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSession(false));
  }, [id]);

  if (profileLoading || loadingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-4xl animate-bounce">⛵</span>
      </div>
    );
  }

  if (error || !session || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">{error || "Session not found."}</p>
      </div>
    );
  }

  const isInstructor = profile.user_role === "instructor" || profile.user_role === "senior_instructor";
  const sessionDate  = new Date(session.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppNav profile={profile} />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8">
        {/* Session info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">{session.title}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{sessionDate}</p>
            </div>
            {isInstructor && (
              <span className="flex-shrink-0 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                {profile.user_role === "senior_instructor" ? "⭐ Senior Instructor" : "🎓 Instructor"}
              </span>
            )}
          </div>
          {session.notes && (
            <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-lg px-3 py-2">{session.notes}</p>
          )}
        </div>

        {/* Role-specific signup */}
        {isInstructor ? (
          <InstructorSignup session={session} userId={profile.id} profileName={profile.name} />
        ) : (
          <SailorSignup session={session} userId={profile.id} profileName={profile.name} />
        )}
      </main>
    </div>
  );
}
