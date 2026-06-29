// Static session config — boats, sailors and instructors now live in Supabase.
// Only non-DB fields remain here.

export const SESSION_CONFIG = {
  objective: "Trapeze & Spinnaker Focus",
  date: new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  // Fallback weather shown while the live API loads
  weatherFallback: {
    windSpeed: "-- kn",
    windDirection: "--",
    windDegrees: "--°",
    tide: "See local tide tables",
    gusts: "-- kn",
  },
  recommendations: [
    { icon: "✓", text: "Four instructors on the water — good coverage",  type: "ok"   as const },
    { icon: "⚠", text: "Beginners (Stage 1) should avoid Fevas today",   type: "warn" as const },
    { icon: "✓", text: "Flooding tide — start near the shore",           type: "ok"   as const },
    { icon: "ℹ", text: "Consider grouping Toppers for a racing drill",   type: "info" as const },
  ],
  notes: "",
};
