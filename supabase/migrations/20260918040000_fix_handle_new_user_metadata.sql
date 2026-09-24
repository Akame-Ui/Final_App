-- Fix handle_new_user to respect role/full_name from auth.users raw_user_meta_data
-- Previously: trigger always inserted with default 'student', ignoring the role chosen at registration.
-- The client signUp now sends role/full_name via options.data -> raw_user_meta_data.
-- This patch makes the trigger authoritative so email-confirmation flows also get the correct role.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta_role text;
  meta_name text;
begin
  meta_role := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'student');
  if meta_role not in ('student', 'teacher') then
    meta_role := 'student';
  end if;
  meta_name := nullif(coalesce(new.raw_user_meta_data->>'full_name', ''), '');

  insert into public.profiles (id, email, full_name, role)
  values (new.id, coalesce(new.email, ''), meta_name, meta_role)
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = case when excluded.role <> 'student' then excluded.role else public.profiles.role end,
    updated_at = now();
  return new;
end;
$$;

-- Backfill existing profiles that are stuck as 'student' but whose auth user metadata says 'teacher'
-- (accounts created before the client passed options.data or before this trigger existed).
-- Only updates rows where role is still default and metadata indicates teacher.
update public.profiles p
set role = 'teacher', updated_at = now()
from auth.users u
where p.id = u.id
  and p.role = 'student'
  and coalesce(nullif(u.raw_user_meta_data->>'role',''), 'student') = 'teacher';

-- Also backfill missing full_name from metadata where profile has none
update public.profiles p
set full_name = nullif(coalesce(u.raw_user_meta_data->>'full_name',''), ''), updated_at = now()
from auth.users u
where p.id = u.id
  and (p.full_name is null or p.full_name = '')
  and nullif(coalesce(u.raw_user_meta_data->>'full_name',''), '') is not null;
