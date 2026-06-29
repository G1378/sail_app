"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { SailorRole, RyaStage, Confidence } from "@/types";

// ── Skills available to pick from ─────────────────────────────
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

// ── Small reusable components ──────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
      {children}
    </span>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
        selected
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

// ── Step types ─────────────────────────────────────────────────
type Step = "account" | "profile" | "done";

interface AccountForm {
  email: string;
  password: string;
  confirmPassword: string;
}

interface ProfileForm {
  name: string;
  stage: RyaStage;
  confidence: Confidence;
  role: SailorRole;
  skills: string[];
}

// ── Main component ─────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [account, setAccount] = useState<AccountForm>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [profile, setProfile] = useState<ProfileForm>({
    name: "",
    stage: 1,
    confidence: "Med",
    role: "Either",
    skills: [],
  });

  // ── Step 1: create auth account ──────────────────────────────
  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (account.password !== account.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (account.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setStep("profile");
  }

  // ── Step 2: save profile ──────────────────────────────────────
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!profile.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired — please sign in again.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("sailor_profiles")
      .insert({
        id:         user.id,
        name:       profile.name.trim(),
        stage:      String(profile.stage),
        confidence: profile.confidence,
        role:       profile.role,
        skills:     profile.skills,
      });

    setLoading(false);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    setStep("done");
  }

  function toggleSkill(skill: string) {
    setProfile((p) => ({
      ...p,
      skills: p.skills.includes(skill)
        ? p.skills.filter((s) => s !== skill)
        : [...p.skills, skill],
    }));
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white px-5 py-4 flex items-center gap-2">
        <span className="text-xl">⛵</span>
        <span className="text-sm font-semibold text-gray-900">Sail Planner</span>
        <span className="ml-auto text-xs text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Sign in
          </Link>
        </span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Progress indicator */}
          {step !== "done" && (
            <div className="flex items-center gap-2 mb-8">
              {(["account", "profile"] as const).map((s, i) => {
                const isComplete = s === "account" && step === "profile";
                const isActive   = step === s;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                      isActive   ? "border-blue-500 bg-blue-500 text-white"
                      : isComplete ? "border-blue-300 bg-blue-50 text-blue-500"
                      : "border-gray-200 bg-white text-gray-400"
                    }`}>
                      {isComplete ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                      {s === "account" ? "Account" : "Your profile"}
                    </span>
                    {i === 0 && <div className="w-8 h-px bg-gray-200 mx-1" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Step 1: Account ── */}
          {step === "account" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
              <p className="text-sm text-gray-500 mb-8">Sign up to join sessions and track your progress.</p>

              <form onSubmit={handleAccountSubmit} className="flex flex-col gap-5">
                <div>
                  <Label>Email</Label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={account.email}
                    onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={account.password}
                    onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))}
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <Label>Confirm password</Label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={account.confirmPassword}
                    onChange={(e) => setAccount((a) => ({ ...a, confirmPassword: e.target.value }))}
                    placeholder="Same password again"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {loading ? "Creating account…" : "Continue"}
                </button>
              </form>
            </div>
          )}

          {/* ── Step 2: Profile ── */}
          {step === "profile" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Tell us about yourself</h1>
              <p className="text-sm text-gray-500 mb-8">This helps instructors plan sessions around your experience.</p>

              <form onSubmit={handleProfileSubmit} className="flex flex-col gap-7">
                {/* Name */}
                <div>
                  <Label>Your name</Label>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    placeholder="First name and last initial, e.g. Ben T."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* RYA Stage */}
                <div>
                  <Label>RYA Stage</Label>
                  <div className="flex flex-col gap-2">
                    {([1, 2, 3, 4] as RyaStage[]).map((s) => (
                      <OptionButton
                        key={s}
                        selected={profile.stage === s}
                        onClick={() => setProfile((p) => ({ ...p, stage: s }))}
                      >
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

                {/* Preferred role */}
                <div>
                  <Label>Preferred role</Label>
                  <div className="flex gap-2">
                    {(["Helm", "Crew", "Either"] as SailorRole[]).map((r) => (
                      <OptionButton
                        key={r}
                        selected={profile.role === r}
                        onClick={() => setProfile((p) => ({ ...p, role: r }))}
                      >
                        {r}
                      </OptionButton>
                    ))}
                  </div>
                </div>

                {/* Confidence */}
                <div>
                  <Label>Confidence on the water</Label>
                  <div className="flex gap-2">
                    {(["Low", "Med", "High"] as Confidence[]).map((c) => (
                      <OptionButton
                        key={c}
                        selected={profile.confidence === c}
                        onClick={() => setProfile((p) => ({ ...p, confidence: c }))}
                      >
                        {c === "Low" ? "Still learning" : c === "Med" ? "Getting there" : "Confident"}
                      </OptionButton>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <Label>Skills you have</Label>
                  <p className="text-xs text-gray-400 mb-3">Pick everything that applies — be honest, it helps with planning.</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SKILLS.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          profile.skills.includes(skill)
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {profile.skills.includes(skill) ? "✓ " : ""}{skill}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {loading ? "Saving profile…" : "Complete registration"}
                </button>
              </form>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === "done" && (
            <div className="text-center py-8">
              <div className="text-5xl mb-5">⛵</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">You're all set, {profile.name.split(" ")[0]}!</h1>
              <p className="text-sm text-gray-500 mb-8">
                Your profile is saved. Check your email to verify your account, then sign in.
              </p>
              <Link
                href="/login"
                className="inline-block w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Go to sign in
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
