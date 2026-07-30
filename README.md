# Sailor sign-up: boat type instead of individual boat

## 1. Run this in Supabase first

```sql
-- Add the new column
alter table session_signups add column if not exists preferred_boat_type text;

-- (Optional, once you're confident nothing else needs it) drop the old FK column:
-- alter table session_signups drop column if exists preferred_boat_id;
```

I left dropping `preferred_boat_id` commented out on purpose — the app no
longer reads or writes it, but there's no harm leaving the column in place
for now in case any other tooling/reports still reference it. Drop it later
once you're sure.

## 2. Files to copy into your repo

| File in this zip | Goes to | What changed |
|---|---|---|
| `src/lib/sessions.ts` | `src/lib/sessions.ts` | `SessionSignup` now has `preferred_boat_type: string \| null` instead of `preferred_boat_id` + a joined `boats` object. `loadSignups` no longer joins the `boats` table (not needed anymore). |
| `src/app/signup/[id]/page.tsx` | `src/app/signup/[id]/page.tsx` | The boat picker now shows one button per **boat class** (Feva / Pico / Topper / Optimist etc.) — deduplicated from your fleet — instead of one button per individual boat ("Feva 1", "Feva 2", "Feva 3"...). |
| `src/app/sessions/[id]/page.tsx` | `src/app/sessions/[id]/page.tsx` | The sign-up list now shows "Preferred boat: Feva" instead of "Preferred boat: Feva 3 (Feva)". |

Verified with `npx tsc --noEmit` and `npm run build` — both clean.
