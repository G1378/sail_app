# New feature: club sailor roster

## 1. Run this in Supabase first

```sql
-- New free-text field for a sailor's next steps
alter table sailor_profiles add column if not exists next_steps text;

-- Let instructors, senior instructors and club managers read every sailor
-- in their own club (not just their own row)
drop policy if exists "staff can read club sailors" on sailor_profiles;
create policy "staff can read club sailors"
on sailor_profiles for select
using (
  club_id in (
    select club_id from sailor_profiles
    where id = auth.uid() and user_role in ('instructor', 'senior_instructor', 'club_manager')
  )
);

-- Let the same roles update a sailor's stage/confidence/next_steps
drop policy if exists "staff can update club sailors" on sailor_profiles;
create policy "staff can update club sailors"
on sailor_profiles for update
using (
  club_id in (
    select club_id from sailor_profiles
    where id = auth.uid() and user_role in ('instructor', 'senior_instructor', 'club_manager')
  )
);

-- Only club managers can remove a sailor from the club
drop policy if exists "club managers can remove club sailors" on sailor_profiles;
create policy "club managers can remove club sailors"
on sailor_profiles for delete
using (
  club_id in (
    select club_id from sailor_profiles
    where id = auth.uid() and user_role = 'club_manager'
  )
);
```

As before, I'm inferring your schema (a `club_id` column on `sailor_profiles`)
from patterns already used elsewhere in the app (loadClubMemberCounts) —
please check the column names match before running, and adjust if not.

**Important**: the UPDATE policy above is deliberately broad — it lets
instructors and senior instructors update *any* column on a club sailor's
row via a raw Supabase call, not just stage/confidence/next_steps (Postgres
RLS policies don't restrict by column). The app's own UI only ever sends
those three fields, but if you want to lock this down at the database level
too (e.g. so instructors can't rename other sailors via the API directly),
that needs a Postgres trigger or a Supabase Edge Function instead of a
plain RLS policy — let me know if you'd like that built.

## 2. Files to copy into your repo

| File in this zip | Goes to | What it does |
|---|---|---|
| `src/lib/roster.ts` | `src/lib/roster.ts` | **New** — load/update/remove sailors in the club roster |
| `src/app/roster/page.tsx` | `src/app/roster/page.tsx` | **New** — the roster page itself |
| `src/components/AppNav.tsx` | `src/components/AppNav.tsx` | Added a "Roster" nav link for instructors, senior instructors, and club managers |

## What it looks like

- Instructors, senior instructors, and club managers get a new **Roster**
  link in the nav bar → a searchable list of every sailor in the club.
- Each sailor's card shows their stage, confidence, role, and next steps at
  a glance. Tap **Edit** to change stage, confidence, or next steps inline,
  then **Save**.
- Club managers only: an inline **Remove from club** button appears in edit
  mode. It requires two taps ("Remove from club" → "Confirm removal") to
  avoid accidental deletions.

## One thing to know about "remove from club"

There's no safe way to fully delete someone's Supabase *auth* account from
client-side code (that requires a service-role key, which should never ship
to the browser). So "remove from club" deletes their `sailor_profiles` row
— which is what actually represents their club membership everywhere else
in this app (their role, stage, club_id, etc. all live there). Their login
account itself still exists, but the next time they sign in they'll hit the
same "no profile found" path the app already uses elsewhere (redirects to
`/register`), effectively locking them out of the club until re-invited.

Verified with `npx tsc --noEmit` and `npm run build` — both clean, all 14
routes (13 before + the new roster page) build successfully.
