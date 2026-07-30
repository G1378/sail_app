import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

if (!supabaseConfigured) {
  // Don't throw here — throwing at module-import time crashes every page that
  // (even transitively) imports this file with Next's raw error overlay,
  // instead of the friendly "check your .env.local" screens pages already
  // build for this exact case. Using obviously-fake values means calls will
  // fail at request time with a normal, catchable error instead.
  // eslint-disable-next-line no-console
  console.error(
    "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-anon-key"
);

// ── Row types that match the DB schema ────────────────────────

export interface DbBoat {
  id: string;
  name: string;
  type: "Feva" | "Pico" | "Topper" | "Optimist";
  instructor: string | null;
  helm: string | null;
  crew: string | null;
  goal: string;
  capacity: number;
  filled: number;
  status: "ready" | "warn" | "alert" | "idle";
  warning: string | null;
  sort_order: number;
}

export interface DbSailor {
  id: string;
  name: string;
  stage: "1" | "2" | "3" | "4";
  confidence: "High" | "Med" | "Low";
  role: "Helm" | "Crew" | "Either";
  skills: string[];
}

export interface DbInstructor {
  id: string;
  name: string;
}

export interface DbSessionBoat {
  id: string;               // session_boats.id — the board-instance id
  session_id: string;
  boat_id: string;           // underlying fleet boats.id
  instructor: string | null;
  assigned_sailors: (string | null)[];
  goal: string;
  status: "ready" | "warn" | "alert" | "idle";
  warning: string | null;
  sort_order: number;
  boats: { name: string; type: "Feva" | "Pico" | "Topper" | "Optimist"; capacity: number } | { name: string; type: "Feva" | "Pico" | "Topper" | "Optimist"; capacity: number }[] | null;
}
