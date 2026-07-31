"use client";

import { useState, useEffect, useMemo } from "react";
import { useProfile } from "@/lib/useProfile";
import { AppNav } from "@/components/AppNav";
import {
  loadClubRoster,
  updateRosterEntry,
  removeSailorFromClub,
  type RosterSailor,
} from "@/lib/roster";
import type { RyaStage, Confidence } from "@/types";

const STAGE_LABELS: Record<RyaStage, string> = {
  1: "Stage 1 — Complete beginner",
  2: "Stage 2 — Basic skills",
  3: "Stage 3 — Developing sailor",
  4: "Stage 4 — Advanced",
};

const CONFIDENCE_OPTIONS: Confidence[] = ["Low", "Med", "High"];
const STAGE_OPTIONS: RyaStage[] = [1, 2, 3, 4];

function confidenceColor(c: Confidence) {
  if (c === "High") return "bg-green-50 text-green-700 border-green-100";
  if (c === "Med")  return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-red-50 text-red-700 border-red-100";
}

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
        selected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function RosterCard({
  sailor,
  canRemove,
  onSave,
  onRemove,
}: {
  sailor: RosterSailor;
  canRemove: boolean;
  onSave: (id: string, update: { stage: RyaStage; confidence: Confidence; nextSteps: string }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [stage, setStage] = useState(sailor.stage);
  const [confidence, setConfidence] = useState(sailor.confidence);
  const [nextSteps, setNextSteps] = useState(sailor.nextSteps);
  const [saving, setSaving] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  function startEdit() {
    setStage(sailor.stage);
    setConfidence(sailor.confidence);
    setNextSteps(sailor.nextSteps);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(sailor.id, { stage, confidence, nextSteps });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    setRemoving(true);
    await onRemove(sailor.id);
    // no need to reset state — this card unmounts once removed from the list
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{sailor.name}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              Stage {sailor.stage}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${confidenceColor(sailor.confidence)}`}>
              {sailor.confidence} confidence
            </span>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              {sailor.role}
            </span>
          </div>
        </div>

        {!editing && (
          <button
            onClick={startEdit}
            className="flex-shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {!editing && sailor.nextSteps && (
        <p className="mt-3 text-xs text-gray-500 border-t border-gray-50 pt-3">
          <span className="font-medium text-gray-600">Next steps: </span>
          {sailor.nextSteps}
        </p>
      )}
      {!editing && !sailor.nextSteps && (
        <p className="mt-3 text-xs text-gray-300 italic border-t border-gray-50 pt-3">No next steps set yet</p>
      )}

      {editing && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-4">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
              {STAGE_LABELS[stage]}
            </span>
            <div className="flex gap-1.5">
              {STAGE_OPTIONS.map((s) => (
                <OptionButton key={s} selected={stage === s} onClick={() => setStage(s)}>Stage {s}</OptionButton>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Confidence</span>
            <div className="flex gap-1.5">
              {CONFIDENCE_OPTIONS.map((c) => (
                <OptionButton key={c} selected={confidence === c} onClick={() => setConfidence(c)}>{c}</OptionButton>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Next steps</span>
            <textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              rows={2}
              placeholder="e.g. Ready to start practicing tacking independently"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            {canRemove && (
              <button
                onClick={handleRemove}
                disabled={removing}
                className={`ml-auto rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                  confirmingRemove
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "text-red-500 hover:bg-red-50"
                }`}
              >
                {removing ? "Removing…" : confirmingRemove ? "Confirm removal" : "Remove from club"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RosterPage() {
  const { profile, loading: profileLoading } = useProfile({
    requireAuth: "/login",
    requireRole: ["instructor", "senior_instructor", "club_manager"],
    redirectIfUnauthorised: "/profile",
  });

  const [roster, setRoster] = useState<RosterSailor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!profile) return;
    loadClubRoster()
      .then(setRoster)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load roster"))
      .finally(() => setLoading(false));
  }, [profile]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((s) => s.name.toLowerCase().includes(q));
  }, [roster, query]);

  async function handleSave(id: string, update: { stage: RyaStage; confidence: Confidence; nextSteps: string }) {
    await updateRosterEntry(id, update);
    setRoster((cur) => cur.map((s) => (s.id === id ? { ...s, ...update } : s)));
  }

  async function handleRemove(id: string) {
    await removeSailorFromClub(id);
    setRoster((cur) => cur.filter((s) => s.id !== id));
  }

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <span className="text-4xl animate-bounce">⛵</span>
          <p className="text-sm font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppNav profile={profile} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Sailor roster</h1>
        <p className="text-sm text-gray-500 mb-5">
          {roster.length} sailor{roster.length !== 1 ? "s" : ""} in your club
        </p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm mb-5 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />

        {error && (
          <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 mb-5">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-10">Loading roster…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            {roster.length === 0 ? "No sailors in your club yet." : "No sailors match your search."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((sailor) => (
              <RosterCard
                key={sailor.id}
                sailor={sailor}
                canRemove={profile.user_role === "club_manager"}
                onSave={handleSave}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
