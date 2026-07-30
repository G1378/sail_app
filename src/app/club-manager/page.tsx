"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/lib/useProfile";
import type { UserRole } from "@/lib/useProfile";
import { AppNav } from "@/components/AppNav";
import { loadBoats, createBoats, deleteBoat, loadClubLocation, saveClubLocation, type ClubLocation } from "@/lib/db";
import { loadInvites, createInvite, revokeInvite, type ClubInvite } from "@/lib/invites";
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

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "sailor",            label: "Sailor" },
  { value: "instructor",        label: "Instructor" },
  { value: "senior_instructor", label: "Senior Instructor" },
  { value: "club_manager",      label: "Club Manager" },
];

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

// ── Invites tab ──────────────────────────────────────────────────

function inviteStatus(invite: ClubInvite): { label: string; colour: string } {
  if (invite.used_at) return { label: "Used", colour: "bg-gray-100 text-gray-500" };
  if (new Date(invite.expires_at) < new Date()) return { label: "Expired", colour: "bg-red-50 text-red-600" };
  return { label: "Pending", colour: "bg-green-50 text-green-700" };
}

function InvitesTab() {
  const [invites, setInvites] = useState<ClubInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [form, setForm] = useState({ role: "sailor" as UserRole, name: "", expiresInDays: 14 });

  async function refresh() {
    const data = await loadInvites();
    setInvites(data);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createInvite(form.role, form.name, form.expiresInDays);
      setForm({ role: "sailor", name: "", expiresInDays: 14 });
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(id: string) {
    await revokeInvite(id);
    await refresh();
  }

  function copyLink(invite: ClubInvite) {
    const url = `${window.location.origin}/register?token=${invite.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Invite a new member</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name (optional label)"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <select
            value={form.expiresInDays}
            onChange={(e) => setForm((f) => ({ ...f, expiresInDays: Number(e.target.value) }))}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value={1}>Expires in 1 day</option>
            <option value={7}>Expires in 7 days</option>
            <option value={14}>Expires in 14 days</option>
            <option value={30}>Expires in 30 days</option>
          </select>
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-xs text-red-700">{error}</p>}
        <button type="submit" disabled={saving}
          className="mt-3 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving ? "Creating…" : "+ Create invite link"}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Invites <span className="text-gray-400 font-normal">({invites.length})</span>
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <span className="text-2xl animate-bounce mr-3">⛵</span>
            <span className="text-sm">Loading…</span>
          </div>
        ) : invites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
            No invites created yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {invites.map((invite) => {
              const status = inviteStatus(invite);
              const canUse = status.label === "Pending";
              return (
                <div key={invite.id} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {invite.invitee_name || "Unnamed invite"}
                      </p>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.colour}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {ROLE_OPTIONS.find((r) => r.value === invite.role)?.label ?? invite.role}
                      {" · expires "}
                      {new Date(invite.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canUse && (
                      <button
                        onClick={() => copyLink(invite)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          copiedId === invite.id
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        }`}
                      >
                        {copiedId === invite.id ? "✓ Copied!" : "🔗 Copy link"}
                      </button>
                    )}
                    <button
                      onClick={() => handleRevoke(invite.id)}
                      className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                    >
                      {canUse ? "Revoke" : "Remove"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
  const [tab, setTab] = useState<"boats" | "invites" | "weather">("boats");

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
          <p className="text-sm text-gray-400 mt-0.5">Manage the club fleet and invite new members.</p>
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
            onClick={() => setTab("invites")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              tab === "invites" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            ✉️ Invites
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

        {tab === "boats" ? <BoatsTab /> : tab === "invites" ? <InvitesTab /> : <WeatherTab />}
      </main>
    </div>
  );
}
