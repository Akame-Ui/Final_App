-- Phase 3: profiles, canonical event timestamps, UUID relationships, trigger, and RLS.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events add column if not exists created_by uuid references auth.users (id) on delete set null;
alter table public.events add column if not exists start_time timestamptz;
alter table public.events add column if not exists end_time timestamptz;

update public.events set start_time = start where start_time is null;
update public.events set end_time = "end" where end_time is null;

alter table public.events drop constraint if exists events_time_order;
alter table public.events drop constraint if exists events_time_order_v2;
alter table public.events add constraint events_time_order_v2 check (end_time is null or start_time is null or end_time > start_time);

create table if not exists public.attendance_v3 (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  unique (student_id, event_id)
);

insert into public.attendance_v3 (student_id, event_id, scanned_at)
select a.student_id::uuid, e.id, a.scanned_at
from public.attendance a
join public.events e on e.event_code = a.event_code
where a.student_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
on conflict (student_id, event_id) do nothing;

drop table if exists public.attendance;
alter table public.attendance_v3 rename to attendance;

alter table public.events drop column if exists start;
alter table public.events drop column if exists "end";

create index if not exists attendance_student_id_idx on public.attendance(student_id);
create index if not exists attendance_event_id_idx on public.attendance(event_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "phase1_events_public_access" on public.events;
drop policy if exists "phase1_attendance_public_access" on public.attendance;
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Events are readable by authenticated users" on public.events;
create policy "Events are readable by authenticated users" on public.events for select to authenticated using (true);
drop policy if exists "Users can insert events" on public.events;
create policy "Users can insert events" on public.events for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "Users can update their own events" on public.events;
create policy "Users can update their own events" on public.events for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
drop policy if exists "Students can view their own attendance" on public.attendance;
create policy "Students can view their own attendance" on public.attendance for select to authenticated using (auth.uid() = student_id);
drop policy if exists "Students can insert their own attendance" on public.attendance;
create policy "Students can insert their own attendance" on public.attendance for insert to authenticated with check (auth.uid() = student_id);
