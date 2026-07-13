import Link from "next/link";

const FEATURES = [
  {
    emoji: "🛥️",
    title: "Fleet planning that actually fits your club",
    body: "Build a session board in seconds — drag sailors onto boats, group by instructor, and see capacity and warnings at a glance.",
  },
  {
    emoji: "📋",
    title: "Sessions with shareable sign-up links",
    body: "Create a session, share one link, and watch sailors and instructors sign themselves up. No spreadsheets, no group chats.",
  },
  {
    emoji: "⛵",
    title: "A fleet pool that scales with your club",
    body: "Add boats once — Fevas, Picos, Toppers, whatever you sail. Add them to a session's board with one click, capacity and all.",
  },
  {
    emoji: "🔒",
    title: "Invite-only membership",
    body: "Nobody joins your club by accident. Every sailor and instructor gets in through a single-use invite link you control.",
  },
];

const STEPS = [
  { step: "1", title: "Start your club", body: "Create your club and become its first club manager in under a minute." },
  { step: "2", title: "Add your fleet", body: "List every boat you sail, by class and capacity." },
  { step: "3", title: "Invite your members", body: "Send single-use invite links to instructors, senior instructors, and sailors." },
  { step: "4", title: "Run your first session", body: "Create a session, share the sign-up link, and plan the board." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white px-5 py-4 flex items-center gap-2">
        <span className="text-xl">⛵</span>
        <span className="text-sm font-semibold text-gray-900">Sail Planner</span>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 font-medium">Sign in</Link>
          <Link href="/club-manager/signup" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            Start your club
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 py-20 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Run your sailing club's sessions without the spreadsheet chaos
        </h1>
        <p className="text-lg text-gray-500 mb-8">
          Fleet planning, session sign-ups, and instructor allocation — all in one place, built for dinghy clubs.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/club-manager/signup" className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            Start your club — free
          </Link>
          <Link href="/login" className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Sign in
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">Free while your club is getting started. Paid plans coming soon.</p>
      </section>

      {/* Features */}
      <section className="px-5 py-16 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Everything a club manager needs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-100 p-6">
                <div className="text-2xl mb-3">{f.emoji}</div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">How it works</h2>
        <div className="flex flex-col gap-6">
          {STEPS.map((s) => (
            <div key={s.step} className="flex items-start gap-4">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                {s.step}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-5 py-16 bg-white border-y border-gray-100 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Pricing</h2>
          <p className="text-sm text-gray-500 mb-6">
            Free to get your club set up. Paid plans for established clubs are coming soon — existing clubs will be notified before anything changes.
          </p>
          <Link href="/club-manager/signup" className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            Start your club — free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-8 text-center">
        <p className="text-xs text-gray-400">⛵ Sail Planner</p>
      </footer>
    </div>
  );
}
