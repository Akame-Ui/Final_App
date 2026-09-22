drop policy if exists "Teachers can view profiles of their attendees" on public.profiles;

create policy "Teachers can view profiles of their attendees"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.attendance a
    join public.events e on e.id = a.event_id
    where a.student_id = profiles.id
      and e.created_by = auth.uid()
  )
);
