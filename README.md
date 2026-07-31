# "Mark complete" now only appears once sign-ups are closed

No SQL needed — pure UI change.

| File | Goes to | What changed |
|---|---|---|
| `src/app/sessions/page.tsx` | `src/app/sessions/page.tsx` | "Mark complete" now shows only when `status === "closed"` (was: `"open"` or `"closed"`) |
| `src/app/sessions/[id]/page.tsx` | `src/app/sessions/[id]/page.tsx` | Same fix on the session detail page |

Status flow is now strictly: **Draft → Publish → Open → Close sign-ups →
Closed → Mark complete → Completed**. You can no longer jump straight from
"open" to "completed" — sign-ups have to be closed first.

Verified with `npx tsc --noEmit` and `npm run build` — both clean.
