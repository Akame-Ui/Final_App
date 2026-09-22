import { supabase } from '@/lib/supabase';
import { getEventByCode } from '@/lib/events';
import { parseQRPayload } from '@/lib/qr';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    studentName: string | null;
    scannedAt: string;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

type EventRow = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
};

type AttendanceRow = {
  event_id: string;
  student_id: string;
  scanned_at: string;
  profiles?: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
};

export async function getTeacherEventAttendance(teacherId: string): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    return [];
  }

  const eventRows = events as EventRow[];
  const eventIds = eventRows.map((event) => event.id);
  if (eventIds.length === 0) {
    return [];
  }

  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('student_id, scanned_at, event_id, profiles ( full_name, email )')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attendanceError || !attendance) {
    return eventRows.map((event) => ({
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: 0,
      attendees: [],
    }));
  }

  const attendanceRows = attendance as AttendanceRow[];
  return eventRows.map((event) => {
    const attendees = attendanceRows
      .filter((row) => row.event_id === event.id)
      .map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          studentId: row.student_id,
          studentName: profile?.full_name ?? null,
          scannedAt: row.scanned_at,
        };
      });

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: attendees.length,
      attendees,
    };
  });
}

export async function getTeacherEventSummary(teacherId: string): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventRows = events as Array<{ id: string; event_code: string; title: string }>;
  const eventIds = eventRows.map((event) => event.id);
  if (eventIds.length === 0) return [];

  const { data: attRows, error: attendanceError } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attendanceError || !attRows) {
    return eventRows.map((event) => ({
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      attendeeCount: 0,
    }));
  }

  const counts: Record<string, number> = {};
  (attRows as Array<{ event_id: string }>).forEach((row) => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  });

  return eventRows.map((event) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}

export async function registerAttendance(rawPayload: string, studentId: string): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) {
    return { success: false, message: parsed.message };
  }

  const payload = parsed.payload;
  const now = Date.now();
  const start = payload.start ? new Date(payload.start).getTime() : null;
  const end = payload.end ? new Date(payload.end).getTime() : null;

  if (start !== null && Number.isNaN(start)) {
    return { success: false, message: 'Invalid event time.' };
  }
  if (end !== null && Number.isNaN(end)) {
    return { success: false, message: 'Invalid event time.' };
  }
  if (start !== null && end !== null && start >= end) {
    return { success: false, message: 'Invalid event time.' };
  }
  if (start !== null && now < start) {
    return { success: false, message: 'Event has not started yet.' };
  }
  if (end !== null && now > end) {
    return { success: false, message: 'Event has already ended.' };
  }

  const title = payload.title ?? payload.event;
  const foundEvent = await getEventByCode(payload.event);
  let event: { id: string; title: string } | null = foundEvent;

  if (!event) {
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        event_code: payload.event,
        title,
        start_time: payload.start ?? null,
        end_time: payload.end ?? null,
      })
      .select('id, title')
      .single();

    if (insertError || !newEvent) {
      return { success: false, message: 'Could not create event.' };
    }
    event = newEvent;
  }

  const { error: attendanceError } = await supabase.from('attendance').insert({
    student_id: studentId,
    event_id: event.id,
  });

  if (attendanceError) {
    if (attendanceError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: event.title,
      };
    }
    return { success: false, message: attendanceError.message, eventTitle: event.title };
  }

  return {
    success: true,
    message: 'Attendance recorded!',
    eventTitle: event.title,
  };
}

export async function getAttendanceHistory(studentId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, events (event_code, title)')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? '',
    scannedAt: row.scanned_at,
  }));
}
