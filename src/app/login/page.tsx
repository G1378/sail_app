"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { roleHomePath, type UserRole } from "@/lib/useProfile";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const userId = signInData.user?.id;
    if (userId) {
      const { data: profile } = await supabase
        .from("sailor_profiles")
        .select("user_role")
        .eq("id", userId)
        .single();
      setLoading(false);
      router.push(roleHomePath((profile?.user_role as UserRole) ?? "sailor"));
      return;
    }

    setLoading(false);
    router.push("/profile");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-100 bg-white px-5 py-4 flex items-center gap-2">
        <span className="text-xl">⛵</span>
        <span className="text-sm font-semibold text-gray-900">Sail Planner</span>
        <span className="ml-auto text-xs text-gray-400">
          New sailor?{" "}
          <Link href="/register" className="text-blue-600 font-medium hover:underline">
            Create account
          </Link>
        </span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-8">Welcome back — sign in to view your profile.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Password
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
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
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
