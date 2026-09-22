-- Phase 1 cloud schema. Authentication and role-based RLS are added in later migration phases.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
  start timestamptz not null,
  "end" timestamptz not null,
  created_at timestamptz not null default now(),
  constraint events_time_order check ("end" > start)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  event_code text not null references public.events(event_code) on delete cascade,
  scanned_at timestamptz not null default now(),
  unique (student_id, event_code)
);

create index if not exists attendance_student_id_idx on public.attendance(student_id);
create index if not exists attendance_event_code_idx on public.attendance(event_code);

-- Temporary Phase 1 access: the app still uses a hardcoded student identity.
-- Replace these policies with auth.uid()-based RLS in the authentication phase.
grant select, insert, update on public.events to anon, authenticated;
grant select, insert on public.attendance to anon, authenticated;

alter table public.events enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "phase1_events_public_access" on public.events;
create policy "phase1_events_public_access" on public.events
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "phase1_attendance_public_access" on public.attendance;
create policy "phase1_attendance_public_access" on public.attendance
  for all to anon, authenticated using (true) with check (true);