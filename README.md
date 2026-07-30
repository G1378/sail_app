# Club weather location — what's in this zip

## 1. Run this in Supabase (SQL editor) first

I don't have access to your database, so I couldn't run this myself — you'll
need to run it once in your Supabase project's SQL editor. It assumes your
club table is called `clubs` and your sailor_profiles row has a `club_id`
and `user_role` column (matching the patterns already used elsewhere in the
codebase, e.g. loadClubMemberCounts). **Check the column names match your
actual schema before running — adjust if yours differ.**

```sql
-- Add weather-location columns to the clubs table
alter table clubs add column if not exists location_name text;
alter table clubs add column if not exists location_lat double precision;
alter table clubs add column if not exists location_lon double precision;

-- Let any member of a club read their own club's row (needed so sailors/
-- instructors/senior instructors can see the club's weather location, not
-- just the manager)
drop policy if exists "club members can read their club" on clubs;
create policy "club members can read their club"
on clubs for select
using (
  id in (select club_id from sailor_profiles where id = auth.uid())
);

-- Only club managers can update the location
drop policy if exists "club managers can update their club" on clubs;
create policy "club managers can update their club"
on clubs for update
using (
  id in (
    select club_id from sailor_profiles
    where id = auth.uid() and user_role = 'club_manager'
  )
);
```

If your `clubs`/`sailor_profiles` schema is structured differently, the app
still works without this migration — it just falls back to the default
location (Brighton, UK) everywhere, silently, since `loadClubLocation()`
catches the error rather than crashing the page.

## 2. Files to copy into your repo

| File in this zip | Goes to | What it does |
|---|---|---|
| `src/lib/geocoding.ts` | `src/lib/geocoding.ts` | **New** — free town/harbour search (Open-Meteo geocoding, no API key) |
| `src/lib/useClubLocation.ts` | `src/lib/useClubLocation.ts` | **New** — hook that loads the club's saved location, falls back to default |
| `src/lib/db.ts` | `src/lib/db.ts` | Added `loadClubLocation` / `saveClubLocation` (only these two functions are new — rest of the file is unchanged) |
| `src/components/SessionHeader.tsx` | `src/components/SessionHeader.tsx` | Now uses the club's location instead of the hardcoded default |
| `src/components/RightSidebar.tsx` | `src/components/RightSidebar.tsx` | Same |
| `src/app/club-manager/page.tsx` | `src/app/club-manager/page.tsx` | New "🌬️ Weather" tab — search for a town/harbour, pick it, saved instantly |

## How it works for the user

- **Automatic**: every sailor/instructor/senior instructor sees weather for
  their club's saved location automatically — no setup needed on their end.
- **Club manager**: on the Club Manager page → **Weather** tab, search for
  their club's town or harbour (e.g. "Cowes" or "Poole"), pick the right
  match from the results, and it saves immediately. The planner and session
  pages pick it up on next load.
- **Fallback**: if a club hasn't set a location yet, everyone sees the
  existing Brighton, UK default — nothing breaks.

Verified with `npx tsc --noEmit` (no errors) and `npm run build` (all 13
routes build cleanly).
