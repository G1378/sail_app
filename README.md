# Two bug fixes

| File | Goes to | Fix |
|---|---|---|
| `src/components/AppNav.tsx` | `src/components/AppNav.tsx` | The nav's **Planner** link (senior instructors only) now looks up whichever session currently has `status = "open"` and links straight to `/planner?session=<id>`. If no session is open, it falls back to the plain `/planner` board as before. |
| `src/app/planner/page.tsx` | `src/app/planner/page.tsx` | Dragging or tapping a sailor onto a boat that's already full now shows an **"X is full"** toast and leaves the sailor in the pool, instead of silently removing them from the pool without ever placing them on the boat. |

## Note on the "open session" logic

Your `sessions` table has a `status` column (`draft` / `open` / `closed` /
`completed`). The nav picks whichever `open` session's date is closest to
today. If you actually have several sessions open at once and want a
different one prioritized (e.g. always the next upcoming one rather than
closest-to-today), let me know and I'll adjust the sort.

Verified with `npx tsc --noEmit` and `npm run build` — both clean, all 13
routes build successfully.
