"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/lib/useProfile";
import { AppNav } from "@/components/AppNav";
import { loadBoats, createBoats, deleteBoat, loadClubLocation, saveClubLocation, type ClubLocation } from "@/lib/db";
import { loadJoinCode, regenerateJoinCode, type JoinCodeInfo } from "@/lib/joinCode";
import { searchLocations, formatGeocodeResult, type GeocodeResult } from "@/lib/geocoding";
import { DEFAULT_LOCATION } from "@/lib/useWeather";
import type { Boat, BoatType } from "@/types";

const BOAT_TYPES: BoatType[] = ["Feva", "Pico", "Topper", "Optimist"];

// If the typed name matches a known class (e.g. "feva"), use its type.
// Otherwise fall back to a generic type so we still have a valid BoatType to save.
function inferBoatType(name: string): BoatType {
  const match = BOAT_TYPES.find((t) => t.toLowerCase() === name.trim().toLowerCase());
  return match ?? "Pico";
}

// ── Boats tab ────────────────────────────────────────────────────

function BoatsTab() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ name: "", capacity: 2, quantity: 1 });

  async function refresh() {
    const data = await loadBoats();
    setBoats(data);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Give the boat class a name, e.g. \"Feva\"."); return; }
    if (form.quantity < 1) { setError("Quantity must be at least 1."); return; }
    if (form.capacity < 1) { setError("Capacity must be at least 1."); return; }
    setSaving(true);
    try {
      const type = inferBoatType(form.name);
      await createBoats({
        namePrefix: form.name.trim(),
        type,
        capacity: form.capacity,
        quantity: form.quantity,
      });
      setForm({ name: "", capacity: 2, quantity: 1 });
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add boats");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(boatId: string) {
    await deleteBoat(boatId);
    await refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Add boats to the fleet</h2>
        <p className="text-xs text-gray-400 mb-4">
          Adding several of the same class? Enter the class name once, how many people fit on each, and how many you have — e.g. "Feva" × 6 creates Feva 1 through Feva 6.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Boat class, e.g. Feva"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="number"
            min={1}
            max={20}
            required
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
            placeholder="Max people"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="number"
            min={1}
            max={50}
            required
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
            placeholder="How many"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-xs text-red-700">{error}</p>}
        <button type="submit" disabled={saving}
          className="mt-3 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving ? "Adding…" : form.quantity > 1 ? `+ Add ${form.quantity} boats` : "+ Add boat"}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Club fleet <span className="text-gray-400 font-normal">({boats.length})</span>
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <span className="text-2xl animate-bounce mr-3">⛵</span>
            <span className="text-sm">Loading…</span>
          </div>
        ) : boats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
            No boats in the fleet yet — add one above.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {boats.map((boat) => (
              <div key={boat.id} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-gray-900">{boat.name}</p>
                  <p className="text-xs text-gray-400">capacity {boat.capacity}</p>
                </div>
                <button
                  onClick={() => handleDelete(boat.id)}
                  className="text-xs text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Join code tab ────────────────────────────────────────────────

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "any moment now";
  const hours = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function JoinCodeTab() {
  const [info, setInfo] = useState<JoinCodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  async function refresh() {
    setError("");
    try {
      setInfo(await loadJoinCode());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load join code");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  // Tick every 30s so the countdown stays roughly current, and re-fetch
  // once the code should have rotated so the new one shows automatically
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (info && new Date(info.expiresAt).getTime() <= now) refresh();
  }, [now, info]);

  function copyCode() {
    if (!info) return;
    navigator.clipboard.writeText(info.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setError("");
    try {
      setInfo(await regenerateJoinCode());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to regenerate code");
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <span className="text-2xl animate-bounce mr-3">⛵</span>
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const msRemaining = info ? new Date(info.expiresAt).getTime() - now : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Club join code</h2>
        <p className="text-xs text-gray-400 mb-5">
          Share this with new members — they enter it at sign-up and pick their own role.
        </p>

        {info && (
          <>
            <div className="text-4xl font-mono font-bold tracking-[0.3em] text-blue-700 mb-4 select-all">
              {info.code}
            </div>

            <div className="flex items-center justify-center gap-2 mb-5">
              <button
                onClick={copyCode}
                className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                  copied
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                {copied ? "✓ Copied!" : "📋 Copy code"}
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                {regenerating ? "Regenerating…" : "🔄 Regenerate now"}
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Rotates automatically in <span className="font-medium text-gray-600">{formatCountdown(msRemaining)}</span> — every 24 hours, for security.
            </p>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-xs text-red-700">{error}</p>
        )}
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <p className="text-xs text-amber-800">
          <span className="font-semibold">Heads up:</span> anyone with this code can join and choose any
          role — including Club Manager. Only share it with people you trust, and regenerate it if it
          ever gets shared more widely than intended (e.g. posted somewhere public).
        </p>
      </div>
    </div>
  );
}

// ── Weather tab ──────────────────────────────────────────────────

function WeatherTab() {
  const [current, setCurrent] = useState<ClubLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    loadClubLocation()
      .then(setCurrent)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load club location"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError("");
    if (!query.trim()) return;
    setSearching(true);
    try {
      const found = await searchLocations(query);
      setResults(found);
      if (found.length === 0) setSearchError("No matches — try a nearby larger town.");
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleChoose(result: GeocodeResult) {
    setError("");
    setSaving(true);
    try {
      const location: ClubLocation = {
        name: formatGeocodeResult(result),
        lat:  result.latitude,
        lon:  result.longitude,
      };
      await saveClubLocation(location);
      setCurrent(location);
      setResults([]);
      setQuery("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400 px-1">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Weather location</h2>
        <p className="text-xs text-gray-400 mb-4">
          Wind and tide readings on the planner and session pages are pulled for this location automatically.
        </p>

        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 mb-5">
          <span className="text-lg">📍</span>
          <div>
            <p className="text-sm font-medium text-blue-900">
              {current ? current.name : DEFAULT_LOCATION.name}
            </p>
            <p className="text-xs text-blue-500">
              {current ? "Set by your club" : "Default — no club location set yet"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for your club's town or harbour…"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors flex-shrink-0"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {searchError && <p className="text-xs text-red-600 mb-3">{searchError}</p>}
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        {saved && <p className="text-xs text-green-600 mb-3">✓ Weather location updated</p>}

        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => handleChoose(r)}
                disabled={saving}
                className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left text-sm hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-60"
              >
                <span className="text-gray-800">{formatGeocodeResult(r)}</span>
                <span className="text-xs text-blue-600 font-medium">Use this</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function ClubManagerPage() {
  const { profile, loading: profileLoading } = useProfile({
    requireAuth: "/login",
    requireRole: ["club_manager"],
    redirectIfUnauthorised: "/planner",
  });
  const [tab, setTab] = useState<"boats" | "code" | "weather">("boats");

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-3xl animate-bounce">⛵</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppNav profile={profile} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Club Manager</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage the club fleet and new member sign-ups.</p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setTab("boats")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              tab === "boats" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            🛥️ Boats
          </button>
          <button
            onClick={() => setTab("code")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              tab === "code" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            🔑 Join Code
          </button>
          <button
            onClick={() => setTab("weather")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              tab === "weather" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            🌬️ Weather
          </button>
        </div>

        {tab === "boats" ? <BoatsTab /> : tab === "code" ? <JoinCodeTab /> : <WeatherTab />}
      </main>
    </div>
  );
}
