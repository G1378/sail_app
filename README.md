# Unassign a sailor + fix boats losing sailors on delete

| File | Goes to | What changed |
|---|---|---|
| `src/lib/db.ts` | `src/lib/db.ts` | Added `restoreSailorToPool` — puts a sailor back in the legacy `sailors` table when unassigned (mirror of the existing `removeSailorFromPool`) |
| `src/components/BoatCard.tsx` | `src/components/BoatCard.tsx` | Each seated sailor now has a small **✕** (visible on hover) to unassign them |
| `src/components/PlanningBoard.tsx` | `src/components/PlanningBoard.tsx` | Threads the new unassign handler down through the instructor-grouped and unassigned-boats sections |
| `src/app/planner/page.tsx` | `src/app/planner/page.tsx` | New `handleUnassignSeat` action; fixed `handleRemoveBoatFromBoard` (the boat delete button) to recover assigned sailors back into the pool instead of losing them |

## What each fix does

**1. Unassign a sailor from a boat**
Hover over any seated sailor's name on a boat card and click the ✕ that
appears. They're removed from that seat and returned to the sailor pool,
sorted back into place — same toast/feedback pattern as assigning.

**2. Deleting a boat no longer loses its sailors**
The "remove from board" (✕) button on a boat card now recovers any sailors
still assigned to it and puts them back in the pool before the boat
disappears, instead of silently discarding them.

## One honest limitation to flag

Boats only ever store a sailor's **name** in each seat — not their id,
stage, confidence, role, or skills. So when I unassign someone (or recover
them from a deleted boat), I first try to look up their full profile from
what was cached in this browser session (when they were originally
assigned). If a sailor was already on a boat *before the page loaded* (e.g.
the board was saved earlier with them on it), their full profile isn't
recoverable from memory, so they come back with generic defaults — Stage 2,
Med confidence, Either role, no skills — rather than their real profile.

Their name is always preserved correctly either way. Fixing this properly
would mean storing sailor IDs (not names) in each boat seat — a schema
change I didn't want to make without your sign-off, since it touches how
boats are saved/loaded everywhere. Happy to do that next if you'd like the
fully correct version.

Verified with `npx tsc --noEmit` and `npm run build` — both clean, all 13
routes build successfully.
