# Rotating club join code — replaces per-person invite links

This fully replaces the old invite-link system, as you asked. Registration
now works with one shared code per club (auto-rotates daily) instead of a
unique link per person, and the new person picks their own role.

## 1. Run this in Supabase first

```sql
-- New columns on clubs for the rotating code
alter table clubs add column if not exists join_code text;
alter table clubs add column if not exists join_code_rotated_at timestamptz;

-- Generates a random 6-character code, avoiding visually ambiguous characters (0/O, 1/I, etc.)
create or replace function generate_join_code()
returns text
language sql
volatile
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', ceil(random() * 32)::int, 1), '')
  from generate_series(1, 6)
$$;

-- Internal: returns a club's current code, rotating it first if it's gone stale (>24h)
create or replace function get_current_join_code(p_club_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_rotated_at timestamptz;
begin
  select join_code, join_code_rotated_at into v_code, v_rotated_at
  from clubs where id = p_club_id;

  if v_code is null or v_rotated_at is null or v_rotated_at < now() - interval '1 day' then
    v_code := generate_join_code();
    update clubs set join_code = v_code, join_code_rotated_at = now() where id = p_club_id;
  end if;

  return v_code;
end;
$$;

-- Club manager: view (and lazily rotate) their own club's current code
create or replace function my_club_join_code()
returns table(code text, rotated_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_code text;
begin
  if my_role() <> 'club_manager' then
    raise exception 'Only club managers can view the join code';
  end if;
  v_club_id := my_club_id();
  v_code := get_current_join_code(v_club_id);
  return query
    select v_code, clubs.join_code_rotated_at, clubs.join_code_rotated_at + interval '1 day'
    from clubs where id = v_club_id;
end;
$$;

-- Club manager: force-rotate early
create or replace function regenerate_my_club_join_code()
returns table(code text, rotated_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_code text;
begin
  if my_role() <> 'club_manager' then
    raise exception 'Only club managers can regenerate the join code';
  end if;
  v_club_id := my_club_id();
  v_code := generate_join_code();
  update clubs set join_code = v_code, join_code_rotated_at = now() where id = v_club_id;
  return query
    select v_code, clubs.join_code_rotated_at, clubs.join_code_rotated_at + interval '1 day'
    from clubs where id = v_club_id;
end;
$$;

-- Public (anon): check whether a code is currently valid, and which club it belongs to.
-- Also lazily rotates if stale, so an old code is rejected even if the club
-- manager hasn't opened the app to trigger rotation themselves.
create or replace function validate_join_code(p_code text)
returns table(is_valid boolean, club_id uuid, club_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club record;
begin
  select id, name, join_code, join_code_rotated_at into v_club
  from clubs where upper(join_code) = upper(p_code);

  if v_club.id is null then
    return query select false, null::uuid, null::text;
    return;
  end if;

  if v_club.join_code_rotated_at is null or v_club.join_code_rotated_at < now() - interval '1 day' then
    return query select false, null::uuid, null::text;
    return;
  end if;

  return query select true, v_club.id, v_club.name;
end;
$$;

grant execute on function validate_join_code(text) to anon;

-- Completes registration using a join code instead of a personal invite token.
-- ⚠️ See the note below — I don't have visibility into your existing
-- `complete_registration` function's exact body, only how the app called it.
-- This mirrors that shape as closely as I can, but please compare it
-- against your existing function (Database → Functions in the Supabase
-- dashboard) before relying on it, in case it does anything extra I
-- couldn't see from the client code alone.
create or replace function complete_registration_with_code(
  p_code text,
  p_role text,
  p_name text,
  p_stage text,
  p_confidence text,
  p_sailor_role text,
  p_skills text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club record;
begin
  if p_role not in ('sailor', 'instructor', 'senior_instructor', 'club_manager') then
    raise exception 'Invalid role';
  end if;

  select id, join_code, join_code_rotated_at into v_club
  from clubs where upper(join_code) = upper(p_code);

  if v_club.id is null or v_club.join_code_rotated_at is null
     or v_club.join_code_rotated_at < now() - interval '1 day' then
    raise exception 'Invalid or expired code';
  end if;

  insert into sailor_profiles (id, club_id, user_role, name, stage, confidence, role, skills)
  values (auth.uid(), v_club.id, p_role, p_name, p_stage, p_confidence, p_sailor_role, p_skills)
  on conflict (id) do update set
    club_id    = excluded.club_id,
    user_role  = excluded.user_role,
    name       = excluded.name,
    stage      = excluded.stage,
    confidence = excluded.confidence,
    role       = excluded.role,
    skills     = excluded.skills;
end;
$$;

grant execute on function complete_registration_with_code(text, text, text, text, text, text, text[]) to authenticated;
```

**Optional cleanup, once you're confident this all works:** your old
`club_invites` table and `complete_registration` / `validate_invite`
functions are no longer used by the app. I left them in place rather than
dropping them — nothing references them anymore, so they're just dead
weight, not a risk. Drop them whenever you're ready.

## 2. Files to copy into your repo

| File in this zip | Goes to | What changed |
|---|---|---|
| `src/lib/joinCode.ts` | `src/lib/joinCode.ts` | **New** — load/regenerate the code (club manager), validate it (public) |
| `src/app/club-manager/page.tsx` | `src/app/club-manager/page.tsx` | "Invites" tab replaced with a "🔑 Join Code" tab — shows the current code, a countdown to next rotation, copy button, and a manual regenerate button |
| `src/app/register/page.tsx` | `src/app/register/page.tsx` | New first step: enter the code + pick your role, before creating an account |

## ⚠️ The security tradeoff, flagged clearly

Since you chose "one code for everyone, they pick their role," **anyone who
has the code can register as a Club Manager** — the most privileged role in
the app. There's a warning banner about this directly on the Join Code tab
now. A few ways to reduce that risk if it matters to you:

- Only share the code verbally / in a private message, not posted publicly
- Hit "Regenerate now" immediately if it's ever shared more widely than intended
- I can restrict which roles are self-selectable at registration (e.g. only
  Sailor and Instructor, with Senior Instructor / Club Manager requiring a
  manual promotion by an existing manager) — just say the word if you want
  that added

## What it looks like

- **Club Manager → Join Code tab**: a big monospace code, a copy button, a
  "regenerate now" button, and a live countdown to the next automatic
  rotation (every 24 hours).
- **Registration**: the very first thing a new person does now is type the
  code and pick their role (Sailor / Instructor / Senior Instructor / Club
  Manager) from four tappable cards, then continues into account creation
  exactly as before.

Verified with `npx tsc --noEmit` and `npm run build` — both clean, all 14
routes build successfully.
