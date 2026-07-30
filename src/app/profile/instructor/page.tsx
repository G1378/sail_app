"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { roleHomePath, type UserRole } from "@/lib/useProfile";
import { loadSessions, loadMyInstructorSignups, cancelInstructorSignup, type Session, type MyInstructorSignup } from "@/lib/sessions";
import { SessionPortal } from "@/components/SessionPortal";
import { AppNav } from "@/components/AppNav";

export default function InstructorProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [saved, setSaved]     = useState(false);
  const [email, setEmail]     = useState("");
  const [name, setName]       = useState("");

  const [openSessions, setOpenSessions] = useState<Session[]>([]);
  const [mySignups, setMySignups]       = useState<MyInstructorSignup[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadPortal = useCallback(async (uid: string) => {
    const [allSessions, signups] = await Promise.all([
      loadSessions(),
      loadMyInstructorSignups(uid),
    ]);
    setOpenSessions(allSessions.filter((s) => s.status === "open"));
    setMySignups(signups);
  }, []);

  async function handleCancelSignup(signupId: string) {
    setCancellingId(signupId);
    try {
      await cancelInstructorSignup(signupId);
      setMySignups((cur) => cur.filter((s) => s.id !== signupId));
    } finally {
      setCancellingId(null);
    }
  }

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
        if (role !== "instructor") {
          router.push(roleHomePath(role));
          return;
        }
        setName(data.name);
      }

      await loadPortal(user.id);
      setLoading(false);
    }
    load();
  }, [router, loadPortal]);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppNav profile={{ name: name || "Instructor", user_role: "instructor" }} />

      <main className="flex-1 px-4 py-10">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Instructor profile</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your details and the sessions you're instructing.</p>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-5 mb-10 pb-10 border-b border-gray-100">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Your name</span>
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
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
            </button>
          </form>

          <SessionPortal
            openSessions={openSessions}
            mySignups={mySignups}
            onCancel={handleCancelSignup}
            cancellingId={cancellingId}
          />
        </div>
      </main>
    </div>
  );
}
