# Sailor cards: simplified to stage, confidence, boat preference

No SQL needed — `preferred_boat_type` already exists on `session_signups`
from the boat-type-preference feature earlier.

## ⚠️ One file to delete

Delete `src/lib/useSailorCardSettings.ts` from your repo — the
customization feature has been fully removed, this file is no longer used
anywhere.

## Files to copy in

| File in this zip | Goes to | What changed |
|---|---|---|
| `src/types/index.ts` | `src/types/index.ts` | Added optional `preferredBoatType` to the `Sailor` type |
| `src/lib/db.ts` | `src/lib/db.ts` | `loadSailorsFromSession` now also selects `preferred_boat_type` from the sign-up and includes it on each `Sailor` |
| `src/components/SailorPool.tsx` | `src/components/SailorPool.tsx` | Removed the customization gear/panel entirely. Card now always shows: **Stage**, **Confidence**, and **boat preference** (role and skills tags are gone) |
| `src/app/planner/page.tsx` | `src/app/planner/page.tsx` | Removed the settings hook import/usage |

## What the card looks like now

Each sailor card shows just three things: their RYA stage badge, their
confidence badge, and a line reading either "⛵ Wants: Feva" (if they set a
boat preference at sign-up) or "⛵ No boat preference" if they didn't.

One note: boat preference only exists for sailors loaded from a session
(`loadSailorsFromSession`) — it comes from their sign-up record. On the
legacy no-session board (`loadSailors`, the old `sailors` table pool),
there's no sign-up to pull a preference from, so those cards will always
show "No boat preference."

Verified with `npx tsc --noEmit` and `npm run build` — both clean, all 14
routes build successfully.
