# Add sailor on the Fleet Planner + fix the missing link to session detail

No SQL changes needed this time — everything here is app code.

| File | Goes to | What changed |
|---|---|---|
| `src/components/AddSailorBox.tsx` | `src/components/AddSailorBox.tsx` | **New** — extracted the "add a sailor manually" UI into its own component so both pages can share it. It now fetches its own data (roster + current sign-ups), so it no longer needs to be told who's already signed up. |
| `src/app/sessions/[id]/page.tsx` | `src/app/sessions/[id]/page.tsx` | Now imports the shared component instead of defining its own copy |
| `src/app/planner/page.tsx` | `src/app/planner/page.tsx` | New **"+ Add sailor"** link in the blue session banner, opens the add-sailor box as a modal. Also fixed a real bug (see below). |
| `src/app/sessions/page.tsx` | `src/app/sessions/page.tsx` | Session titles are now links to the detail page, plus a new **"👥 Manage sign-ups"** button next to Fleet Planner |

## The actual bug behind "hard to find"

You were right — I checked, and the Sessions list had **no link to the
session detail page at all**. Every card had buttons for Fleet Planner,
copy invite link, and status changes, but nothing pointing at
`/sessions/[id]`. Unless you already knew the URL, there was no way to get
there through the UI. Fixed now with both a clickable title and an explicit
"Manage sign-ups" button.

## Fleet Planner: add sailor

In the blue banner that shows when you're planning from a session, there's
now a **"+ Add sailor"** link next to "Clear session." It opens the same
add-sailor search box as a modal — pick someone, they land straight in the
pool, ready to drag onto a boat. You can add several in a row without
closing the modal.

## Bonus bug fix along the way

While wiring the pool refresh for the new button, I found (and fixed) a
real bug: reloading the Fleet Planner for a session with existing boat
assignments would show already-assigned sailors **both** on their boat
*and* back in the pool, since the pool load never excluded people already
seated somewhere. Fixed — the pool now correctly excludes anyone already on
a boat, on both the initial load and the new "add sailor" refresh.

One side effect: the banner text now says "X sailors **in the pool**"
instead of "X sailors loaded," since that count no longer includes
already-assigned sailors — it's more accurate, but the wording changed
slightly.

Verified with `npx tsc --noEmit` and `npm run build` — both clean, all 14
routes build successfully.
