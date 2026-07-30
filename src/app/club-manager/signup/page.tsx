"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
      {children}
    </span>
  );
}

export default function StartYourClubPage() {
  const [clubName, setClubName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!clubName.trim()) {
      setError("Please enter your club's name.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    const { error: rpcError } = await supabase.rpc("create_club", {
      p_club_name: clubName.trim(),
      p_manager_name: name.trim(),
    });
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setDone(true);
  }

  // ── Done ──────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="border-b border-gray-100 bg-white px-5 py-4 flex items-center gap-2">
          <span className="text-xl">⛵</span>
          <span className="text-sm font-semibold text-gray-900">Sail Planner</span>
        </header>

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center py-8">
            <div className="text-5xl mb-5">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {clubName} is set up!
            </h1>
            <p className="text-sm text-gray-500 mb-2">
              Check your email to verify your account — your club activates automatically once you do.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Then sign in and head to the Club Manager page to add your fleet and invite members.
            </p>
            <Link
              href="/login"
              className="inline-block w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Go to sign in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-100 bg-white px-5 py-4 flex items-center gap-2">
        <span className="text-xl">⛵</span>
        <span className="text-sm font-semibold text-gray-900">Sail Planner</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Start your club</h1>
          <p className="text-sm text-gray-500 mb-8">
            Create your club and become its first club manager.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <Label>Club name</Label>
              <input
                type="text"
                required
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="e.g. Riverside Sailing Club"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <Label>Your name</Label>
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name and last initial, e.g. Sarah M."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <Label>Email</Label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <Label>Password</Label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <Label>Confirm password</Label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Same password again"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
              {loading ? "Creating your club…" : "Start your club"}
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
          <p className="text-sm text-center mt-2">
            <Link href="/" className="text-gray-400 hover:text-gray-600">
              ← Back home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
