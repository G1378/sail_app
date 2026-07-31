"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { roleHomePath, type UserRole } from "@/lib/useProfile";
import { AppNav } from "@/components/AppNav";
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

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    stage: 1,
    confidence: "Med",
    role: "Either",
    skills: [],
  });

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

      setLoading(false);
    }
    load();
  }, [router]);

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
      <AppNav profile={{ name: form.name || "Sailor", user_role: "sailor" }} />

      <main className="flex-1 px-4 py-10">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your profile</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage your sailing profile.</p>
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

            {/* RYA Stage — read-only, set by instructors */}
            <div>
              <Label>RYA Stage</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-700">{STAGE_LABELS[form.stage]}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">🔒 Set by your instructor</span>
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

            {/* Confidence — read-only, set by instructors */}
            <div>
              <Label>Confidence on the water</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-700">
                  {form.confidence === "Low" ? "Still learning" : form.confidence === "Med" ? "Getting there" : "Confident"}
                </span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">🔒 Set by your instructor</span>
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
        </div>
      </main>
    </div>
  );
}
