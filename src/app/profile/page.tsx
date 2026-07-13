"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { roleHomePath, type UserRole } from "@/lib/useProfile";
import { loadSessions, loadMySailorSignups, cancelSailorSignup, type Session, type MySailorSignup } from "@/lib/sessions";
import { SessionPortal } from "@/components/SessionPortal";
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

interface ProfileForm {
  name: string;
  stage: RyaStage;
  confidence: Confidence;
  role: SailorRole;
  skills: string[];
}

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

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [openSessions, setOpenSessions] = useState<Session[]>([]);
  const [mySignups, setMySignups]       = useState<MySailorSignup[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    stage: 1,
    confidence: "Med",
    role: "Either",
    skills: [],
  });

  const loadPortal = useCallback(async (uid: string) => {
    const [allSessions, signups] = await Promise.all([
      loadSessions(),
      loadMySailorSignups(uid),
    ]);
    setOpenSessions(allSessions.filter((s) => s.status === "open"));
    setMySignups(signups);
  }, []);

  async function handleCancelSignup(signupId: string) {
    setCancellingId(signupId);
    try {
      await cancelSailorSignup(signupId);
      setMySignups((cur) => cur.filter((s) => s.id !== signupId));
    } finally {
      setCancellingId(null);
    }
  }

  // ── Load profile on mount ─────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? "");
      setUserId(user.id);

      const { data, error: fetchError } = await supabase
        .from("sailor_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = no rows — that's fine (profile not yet created)
        setError(fetchError.message);
      }

      if (data) {
        // This page is sailor-only — send other roles to their own page
        const role = data.user_role as UserRole;
        if (role && role !== "sailor") {
          router.push(roleHomePath(role));
          return;
        }

        setForm({
          name:       data.name,
          stage:      parseInt(data.stage) as RyaStage,
          confidence: data.confidence,
          role:       data.role,
          skills:     data.skills ?? [],
        });
      }

      await loadPortal(user.id);
      setLoading(false);
    }
    load();
  }, [router, loadPortal]);

  // ── Save ──────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error: upsertError } = await supabase
      .from("sailor_profiles")
      .upsert({
        id:         user.id,
        name:       form.name.trim(),
        stage:      String(form.stage),
        confidence: form.confidence,
        role:       form.role,
        skills:     form.skills,
      });

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // ── Sign out ──────────────────────────────────────────────
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function toggleSkill(skill: string) {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill)
        ? f.skills.filter((s) => s !== skill)
        : [...f.skills, skill],
    }));
  }

  // ── Loading screen ────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <span className="text-4xl animate-bounce">⛵</span>
          <p className="text-sm font-medium">Loading profile…</p>
        </div>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-100 bg-white px-5 py-4 flex items-center gap-2">
        <span className="text-xl">⛵</span>
        <span className="text-sm font-semibold text-gray-900">Sail Planner</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden sm:block">{email}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your profile</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage your details and your sessions.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-7">
            {/* Name */}
            <div>
              <Label>Your name</Label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                    selected={form.stage === s}
                    onClick={() => setForm((f) => ({ ...f, stage: s }))}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.stage === s ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                        {form.stage === s && <span className="h-2 w-2 rounded-full bg-white" />}
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
                    selected={form.role === r}
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
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
                    selected={form.confidence === c}
                    onClick={() => setForm((f) => ({ ...f, confidence: c }))}
                  >
                    {c === "Low" ? "Still learning" : c === "Med" ? "Getting there" : "Confident"}
                  </OptionButton>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <Label>Skills</Label>
              <p className="text-xs text-gray-400 mb-3">Tick everything that applies.</p>
              <div className="flex flex-wrap gap-2">
                {ALL_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      form.skills.includes(skill)
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {form.skills.includes(skill) ? "✓ " : ""}{skill}
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
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-gray-100">
            <SessionPortal
              openSessions={openSessions}
              mySignups={mySignups}
              onCancel={handleCancelSignup}
              cancellingId={cancellingId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
