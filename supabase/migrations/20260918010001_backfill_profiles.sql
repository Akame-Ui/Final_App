-- Backfill profiles for accounts created before the Phase 3 signup trigger.
insert into public.profiles (id, email)
select id, coalesce(email, '')
from auth.users
on conflict (id) do update set email = excluded.email, updated_at = now();
