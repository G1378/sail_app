# Sailor profile: lock stage/confidence, remove session info, sign-up flow

No SQL required for the app to work — but see the optional hardening note
at the bottom.

| File | Goes to | What changed |
|---|---|---|
| `src/app/profile/page.tsx` | `src/app/profile/page.tsx` | RYA Stage and Confidence are now **read-only** (shown as a locked field with a 🔒 note); removed the entire "My sessions" section (open sessions, sign-ups, cancel) — that all lives on the Sessions page now |
| `src/app/sessions/page.tsx` | `src/app/sessions/page.tsx` | Sailors now tap a session card to go straight to `/signup/[id]` instead of seeing a "copy invite link" button. Instructors and club managers are unchanged — they still get the copy-link button, since they're the ones sharing it onward. |

## What sailors can still edit themselves

Name, preferred role (Helm/Crew/Either), and skills — exactly as you said.
Stage and confidence are locked; only instructors, senior instructors, and
club managers can change those now, via the **Roster** page from before.

## One thing worth flagging: this lock is UI-only right now

The profile page no longer *offers* a way to change stage/confidence, and
the save button doesn't send different values than what was loaded — but
if your `sailor_profiles` table has a permissive "own profile" RLS UPDATE
policy (the kind that lets a sailor update any column on their own row),
someone could still technically change their own stage/confidence with a
raw API call, bypassing the UI entirely.

If you want that closed at the database level too, here's an optional
trigger that blocks a sailor from changing their *own* stage/confidence,
while still allowing staff to change it on someone else's row (which is
exactly what the Roster feature does):

```sql
create or replace function prevent_sailor_self_edit_stage_confidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only blocks when the person making the change is the row's own sailor
  if auth.uid() = OLD.id then
    if NEW.stage is distinct from OLD.stage or NEW.confidence is distinct from OLD.confidence then
      raise exception 'Only instructors can change RYA stage or confidence';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_prevent_sailor_self_edit_stage_confidence on sailor_profiles;
create trigger trg_prevent_sailor_self_edit_stage_confidence
before update on sailor_profiles
for each row
execute function prevent_sailor_self_edit_stage_confidence();
```

This is optional — the app itself no longer lets a sailor change these
fields either way. Run it only if you want belt-and-braces protection
against someone bypassing the UI directly.

Verified with `npx tsc --noEmit` and `npm run build` — both clean, all 14
routes build successfully.
