"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { roleHomePath, type UserRole } from "@/lib/useProfile";
import { loadSessions, type Session } from "@/lib/sessions";
import { loadFleetBoats, loadClubMemberCounts } from "@/lib/db";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

export default function SeniorInstructorProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [saved, setSaved]     = useState(false);
  const [email, setEmail]     = useState("");
  const [name, setName]       = useState("");

  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [boatCount, setBoatCount] = useState(0);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  const loadDashboard = useCallback(async () => {
    const [sessions, boats, counts] = await Promise.all([
      loadSessions(),
      loadFleetBoats(),
      loadClubMemberCounts(),
    ]);
    setUpcomingSessions(sessions.filter((s) => s.status !== "completed"));
    setBoatCount(boats.length);
    setMemberCounts(counts);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setEmail(user.email ?? "");

      const { data, error: fetchError } = await supabase
        .from("sailor_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        setError(fetchError.message);
      }

      if (data) {
        const role = data.user_role as UserRole;
        if (role !== "senior_instructor") {
          router.push(roleHomePath(role));
          return;
        }
        setName(data.name);
      }

      await loadDashboard();
      setLoading(false);
    }
    load();
  }, [router, loadDashboard]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error: updateError } = await supabase
      .from("sailor_profiles")
      .update({ name: name.trim() })
      .eq("id", user.id);

    setSaving(false);
    if (updateError) { setError(updateError.message); return; }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

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

  const sailorCount     = memberCounts["sailor"] ?? 0;
  const instructorCount = (memberCounts["instructor"] ?? 0) + (memberCounts["senior_instructor"] ?? 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-100 bg-white px-5 py-4 flex items-center gap-2">
        <span className="text-xl">⛵</span>
        <span className="text-sm font-semibold text-gray-900">Sail Planner</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden sm:block">{email}</span>
          <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Senior Instructor</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your club at a glance.</p>
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-2 mb-8">
          <Link href="/planner" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
            ⛵ Fleet Planner
          </Link>
          <Link href="/sessions" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            📋 Sessions
          </Link>
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <StatCard label="Upcoming sessions" value={upcomingSessions.length} />
          <StatCard label="Boats in fleet" value={boatCount} />
          <StatCard label="Sailors" value={sailorCount} />
          <StatCard label="Instructors" value={instructorCount} />
        </div>

        {/* Upcoming sessions list */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Upcoming sessions</h2>
          {upcomingSessions.length === 0 ? (
            <p className="text-xs text-gray-400">No upcoming sessions — create one on the Sessions page.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm hover:border-blue-200 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{session.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(session.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs font-semibold text-blue-600 capitalize">{session.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Basic account info */}
        <form onSubmit={handleSave} className="flex flex-col gap-4 pt-8 border-t border-gray-100 max-w-sm">
          <h2 className="text-sm font-semibold text-gray-900">Your details</h2>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
          </button>
        </form>
      </main>
    </div>
  );
}
