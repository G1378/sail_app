"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { validateJoinCode } from "@/lib/joinCode";
import type { UserRole } from "@/lib/useProfile";
import type { SailorRole, RyaStage, Confidence } from "@/types";

const ALL_SKILLS = [
  "Balance", "Steering", "Tacking", "Gybing",
  "Spinnaker", "Trapeze", "Race", "Start", "Rules", "Capsize Recovery",
];

const STAGE_LABELS: Record<RyaStage, string> = {
  1: "Stage 1 — Complete beginner",
  2: "Stage 2 — Basic skills",
  3: "Stage 3 — Developing sailor",
  4: "Stage 4 — Advanced",
};

const ROLE_LABELS: Record<UserRole, { emoji: string; title: string }> = {
  sailor:             { emoji: "🌊", title: "Sailor" },
  instructor:         { emoji: "🎓", title: "Instructor" },
  senior_instructor:  { emoji: "⭐", title: "Senior Instructor" },
  club_manager:       { emoji: "🛠️", title: "Club Manager" },
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
      {children}
    </span>
  );
}

function OptionButton({ selected, onClick, children }: {
  selected: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
        selected ? "border-blue-500 bg-blue-50 text-blue-700"
        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
      }`}>
      {children}
    </button>
  );
}

type Step = "code" | "account" | "profile" | "done";

function RegisterInner() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [chosenRole, setChosenRole] = useState<UserRole | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);

  const [step, setStep]     = useState<Step>("code");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const [account, setAccount] = useState({ email: "", password: "", confirmPassword: "" });
  const [profile, setProfile] = useState({
    name: "", stage: 1 as RyaStage, confidence: "Med" as Confidence,
    role: "Either" as SailorRole, skills: [] as string[],
  });

  // Step 0 — check the club join code and confirm the chosen role
  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!chosenRole) { setError("Please choose which role you're joining as."); return; }
    setLoading(true);
    try {
      const result = await validateJoinCode(code.trim());
      if (!result || !result.is_valid) {
        setError("That code isn't valid or has expired — ask your club manager for the current one.");
        return;
      }
      setClubName(result.club_name);
      setStep("account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check code");
    } finally {
      setLoading(false);
    }
  }

  // Step 1 — create auth account
  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (account.password !== account.confirmPassword) { setError("Passwords don't match."); return; }
    if (account.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email: account.email, password: account.password });
    setLoading(false);
    if (err) { setError(err.message); return; }

    // Instructors / senior instructors / club managers skip the sailing-specific profile step
    if (chosenRole === "sailor") { setStep("profile"); }
    else { await handleSaveProfile(); }
  }

  // Step 2 — save full profile (sailors only reach this as a separate step)
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!profile.name.trim()) { setError("Please enter your name."); return; }
    await handleSaveProfile();
  }

  async function handleSaveProfile() {
    if (!chosenRole) return;
    setLoading(true);

    const isSailor = chosenRole === "sailor";
    const { error: err } = await supabase.rpc("complete_registration_with_code", {
      p_code:        code.trim(),
      p_role:        chosenRole,
      p_name:        profile.name.trim() || "Unknown",
      p_stage:       isSailor ? String(profile.stage) : "1",
      p_confidence:  isSailor ? profile.confidence : "High",
      p_sailor_role: isSailor ? profile.role : "Either",
      p_skills:      isSailor ? profile.skills : [],
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep("done");
  }

  function toggleSkill(skill: string) {
    setProfile((p) => ({
      ...p,
      skills: p.skills.includes(skill) ? p.skills.filter((s) => s !== skill) : [...p.skills, skill],
    }));
  }

  const STEPS: Step[] = chosenRole === "sailor" ? ["code", "account", "profile"] : ["code", "account"];
  const stepIndex = STEPS.indexOf(step);
  const roleLabel = chosenRole ? ROLE_LABELS[chosenRole] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-100 bg-white px-5 py-4 flex items-center gap-2">
        <span className="text-xl">⛵</span>
        <span className="text-sm font-semibold text-gray-900">Sail Planner</span>
        <span className="ml-auto text-xs text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Club banner — shown once the code's been validated */}
          {step !== "done" && step !== "code" && roleLabel && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <span className="text-xl">{roleLabel.emoji}</span>
              <div>
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">
                  Joining{clubName ? ` ${clubName}` : ""} as
                </p>
                <p className="text-sm font-semibold text-blue-800">{roleLabel.title}</p>
              </div>
            </div>
          )}

          {/* Progress */}
          {step !== "done" && (
            <div className="flex items-center gap-2 mb-8">
              {STEPS.map((s, i) => {
                const isComplete = i < stepIndex;
                const isActive   = step === s;
                const label = s === "code" ? "Club code" : s === "account" ? "Account" : "Your profile";
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                      isActive    ? "border-blue-500 bg-blue-500 text-white"
                      : isComplete ? "border-blue-300 bg-blue-50 text-blue-500"
                      : "border-gray-200 bg-white text-gray-400"
                    }`}>
                      {isComplete ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
                    {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-200 mx-1" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Step 0: Club code + role ── */}
          {step === "code" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Join your club</h1>
              <p className="text-sm text-gray-500 mb-8">Enter the code your club manager shared with you.</p>
              <form onSubmit={handleCodeSubmit} className="flex flex-col gap-6">
                <div>
                  <Label>Club code</Label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 7F3KQD"
                    maxLength={8}
                    autoCapitalize="characters"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-lg font-mono tracking-[0.2em] text-center uppercase focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="text-xs text-gray-400 mt-2">This changes daily — ask your club manager if it doesn't work.</p>
                </div>

                <div>
                  <Label>I'm joining as a…</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setChosenRole(r)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition-all ${
                          chosenRole === r ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className="text-lg">{ROLE_LABELS[r].emoji}</span>
                        <span className="text-xs font-semibold text-gray-700">{ROLE_LABELS[r].title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}
                <button type="submit" disabled={loading || !code.trim() || !chosenRole}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {loading ? "Checking…" : "Continue"}
                </button>
              </form>
            </div>
          )}

          {/* ── Step 1: Account ── */}
          {step === "account" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
              <p className="text-sm text-gray-500 mb-8">Sign up to join sessions.</p>
              <form onSubmit={handleAccountSubmit} className="flex flex-col gap-5">
                <div>
                  <Label>Email</Label>
                  <input type="email" required autoComplete="email" value={account.email}
                    onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <Label>Password</Label>
                  <input type="password" required autoComplete="new-password" value={account.password}
                    onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))}
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <Label>Confirm password</Label>
                  <input type="password" required autoComplete="new-password" value={account.confirmPassword}
                    onChange={(e) => setAccount((a) => ({ ...a, confirmPassword: e.target.value }))}
                    placeholder="Same password again"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>

                {/* Name field shown here for non-sailors (no separate profile step) */}
                {chosenRole !== "sailor" && (
                  <div>
                    <Label>Your name</Label>
                    <input type="text" required value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      placeholder="First name and last initial, e.g. Sarah M."
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                )}

                {error && <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}
                <button type="submit" disabled={loading || (chosenRole !== "sailor" && !profile.name.trim())}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {loading ? "Creating account…" : "Continue"}
                </button>
              </form>
            </div>
          )}

          {/* ── Step 2: Profile (sailors only) ── */}
          {step === "profile" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Tell us about yourself</h1>
              <p className="text-sm text-gray-500 mb-8">Helps instructors plan sessions around your experience.</p>
              <form onSubmit={handleProfileSubmit} className="flex flex-col gap-7">
                <div>
                  <Label>Your name</Label>
                  <input type="text" required autoComplete="name" value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    placeholder="First name and last initial, e.g. Ben T."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>

                <div>
                  <Label>RYA Stage</Label>
                  <div className="flex flex-col gap-2">
                    {([1, 2, 3, 4] as RyaStage[]).map((s) => (
                      <OptionButton key={s} selected={profile.stage === s} onClick={() => setProfile((p) => ({ ...p, stage: s }))}>
                        <span className="flex items-center gap-2">
                          <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${profile.stage === s ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                            {profile.stage === s && <span className="h-2 w-2 rounded-full bg-white" />}
                          </span>
                          {STAGE_LABELS[s]}
                        </span>
                      </OptionButton>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Preferred role</Label>
                  <div className="flex gap-2">
                    {(["Helm", "Crew", "Either"] as SailorRole[]).map((r) => (
                      <OptionButton key={r} selected={profile.role === r} onClick={() => setProfile((p) => ({ ...p, role: r }))}>{r}</OptionButton>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Confidence on the water</Label>
                  <div className="flex gap-2">
                    {(["Low", "Med", "High"] as Confidence[]).map((c) => (
                      <OptionButton key={c} selected={profile.confidence === c} onClick={() => setProfile((p) => ({ ...p, confidence: c }))}>
                        {c === "Low" ? "Still learning" : c === "Med" ? "Getting there" : "Confident"}
                      </OptionButton>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Skills you have</Label>
                  <p className="text-xs text-gray-400 mb-3">Pick everything that applies.</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SKILLS.map((skill) => (
                      <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          profile.skills.includes(skill) ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                        }`}>
                        {profile.skills.includes(skill) ? "✓ " : ""}{skill}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {loading ? "Saving…" : "Complete registration"}
                </button>
              </form>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="text-center py-8">
              <div className="text-5xl mb-5">⛵</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                You're all set{profile.name ? `, ${profile.name.split(" ")[0]}` : ""}!
              </h1>
              <p className="text-sm text-gray-500 mb-8">
                Your profile is saved. Check your email to verify your account, then sign in.
              </p>
              <Link href="/login" className="inline-block w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                Go to sign in
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-3xl animate-bounce">⛵</span>
      </div>
    }>
      <RegisterInner />
    </Suspense>
  );
}
