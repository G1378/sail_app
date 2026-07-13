"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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

  if (done) {
    return (
      <div style={{ maxWidth: 400, margin: "40px auto", fontFamily: "sans-serif" }}>
        <h1>{clubName} is set up 🎉</h1>
        <p>Check your email to verify your account — your club activates automatically once you do.</p>
        <p>Then sign in and head to the Club Manager page to add your fleet and invite members.</p>
        <Link href="/login">Go to sign in</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Start your club</h1>
      <p>Create your club and become its first club manager.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
        <label>
          Club name
          <br />
          <input
            type="text"
            required
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            placeholder="e.g. Riverside Sailing Club"
            style={{ width: "100%", padding: 6 }}
          />
        </label>

        <label>
          Your name
          <br />
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 6 }}
          />
        </label>

        <label>
          Email
          <br />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 6 }}
          />
        </label>

        <label>
          Password
          <br />
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 6 }}
          />
        </label>

        <label>
          Confirm password
          <br />
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: "100%", padding: 6 }}
          />
        </label>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: 8 }}>
          {loading ? "Creating your club…" : "Start your club"}
        </button>
      </form>

      <p style={{ marginTop: 20 }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
      <p style={{ marginTop: 8 }}>
        <Link href="/">← Back home</Link>
      </p>
    </div>
  );
}
