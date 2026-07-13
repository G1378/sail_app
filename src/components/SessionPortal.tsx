"use client";

import Link from "next/link";
import type { Session } from "@/lib/sessions";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

interface MySignupRow {
  id: string;
  session: Session;
}

interface SessionPortalProps {
  openSessions: Session[];
  mySignups: MySignupRow[];
  onCancel: (signupId: string) => void;
  cancellingId?: string | null;
}

export function SessionPortal({ openSessions, mySignups, onCancel, cancellingId }: SessionPortalProps) {
  const mySessionIds = new Set(mySignups.map((s) => s.session.id));
  const joinable = openSessions.filter((s) => !mySessionIds.has(s.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Your sessions <span className="text-gray-400 font-normal">({mySignups.length})</span>
        </h2>
        {mySignups.length === 0 ? (
          <p className="text-xs text-gray-400">You're not signed up to anything yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {mySignups.map(({ id, session }) => (
              <div key={id} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-gray-900">{session.title}</p>
                  <p className="text-xs text-gray-400">{formatDate(session.date)}</p>
                </div>
                <button
                  onClick={() => onCancel(id)}
                  disabled={cancellingId === id}
                  className="flex-shrink-0 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {cancellingId === id ? "Cancelling…" : "Cancel"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Sessions you can join <span className="text-gray-400 font-normal">({joinable.length})</span>
        </h2>
        {joinable.length === 0 ? (
          <p className="text-xs text-gray-400">No open sessions right now — check back later.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {joinable.map((session) => (
              <Link
                key={session.id}
                href={`/signup/${session.id}`}
                className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm hover:border-blue-200 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{session.title}</p>
                  <p className="text-xs text-gray-400">{formatDate(session.date)}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-semibold text-blue-600">Sign up →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
