drop policy if exists "Teachers can view attendance for their events" on public.attendance;

create policy "Teachers can view attendance for their events"
on public.attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = attendance.event_id
      and e.created_by = auth.uid()
  )
);
