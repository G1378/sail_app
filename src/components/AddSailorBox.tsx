"use client";

import { useState, useEffect } from "react";
import { loadClubRoster, type RosterSailor } from "@/lib/roster";
import { loadSignups, addSailorSignup } from "@/lib/sessions";

interface AddSailorBoxProps {
  sessionId: string;
  onAdded: () => void;
  /** Renders already expanded with no internal collapse/expand toggle — for use inside a modal */
  startExpanded?: boolean;
  /** Called instead of the internal collapse when startExpanded is set */
  onClose?: () => void;
}

export function AddSailorBox({ sessionId, onAdded, startExpanded, onClose }: AddSailorBoxProps) {
  const [open, setOpen] = useState(Boolean(startExpanded));
  const [roster, setRoster] = useState<RosterSailor[]>([]);
  const [signedUpIds, setSignedUpIds] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(false);
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadData() {
    setLoadingData(true);
    setError("");
    try {
      const [r, signups] = await Promise.all([loadClubRoster(), loadSignups(sessionId)]);
      setRoster(r);
      setSignedUpIds(new Set(signups.map((s) => s.sailor_profile_id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sailors");
    } finally {
      setLoadingData(false);
    }
  }

  // Modal usage — load as soon as it's mounted, since there's no separate "open" click
  useEffect(() => {
    if (startExpanded) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startExpanded, sessionId]);

  async function handleOpen() {
    setOpen(true);
    await loadData();
  }

  async function handleAdd(sailorId: string) {
    setAddingId(sailorId);
    setError("");
    try {
      await addSailorSignup(sessionId, sailorId);
      setSignedUpIds((cur) => new Set(cur).add(sailorId));
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add sailor");
    } finally {
      setAddingId(null);
    }
  }

  function handleClose() {
    if (onClose) onClose();
    else setOpen(false);
  }

  const available = roster.filter(
    (s) => !signedUpIds.has(s.id) && s.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="w-full rounded-2xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
      >
        + Add a sailor manually
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Add a sailor manually</h3>
        <button onClick={handleClose} className="text-xs text-gray-400 hover:text-gray-600">
          Close
        </button>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sailors…"
        autoFocus
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      {loadingData ? (
        <p className="text-xs text-gray-400 mt-3 text-center py-3">Loading sailors…</p>
      ) : (
        <div className="flex flex-col gap-1.5 mt-3 max-h-64 overflow-y-auto">
          {available.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">
              {roster.length === 0
                ? "No sailors found in your club."
                : "No matches — or everyone's already signed up."}
            </p>
          ) : (
            available.map((s) => (
              <button
                key={s.id}
                onClick={() => handleAdd(s.id)}
                disabled={addingId === s.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-60"
              >
                <span className="text-sm text-gray-800">{s.name}</span>
                <span className="text-xs text-blue-600 font-medium">
                  {addingId === s.id ? "Adding…" : "+ Add"}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
