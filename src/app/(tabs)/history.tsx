import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { getAttendanceHistory, getTeacherEventAttendance, type AttendanceRecord, type TeacherEventAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/profiles';
import { getProfile } from '@/lib/profiles';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const profile = await getProfile(user.id);
    const currentRole = profile?.role ?? 'student';
    setRole(currentRole);

    if (currentRole === 'teacher') {
      setTeacherEvents(await getTeacherEventAttendance(user.id));
      setStudentRecords([]);
    } else {
      setStudentRecords(await getAttendanceHistory(user.id));
      setTeacherEvents([]);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ATTENDANCE</Text>
        <Text style={styles.title}>{role === 'teacher' ? 'Event attendance' : 'Scan history'}</Text>
        <Text style={styles.subtitle}>
          {role === 'teacher' ? 'Attendance for events you created.' : 'Every event check-in recorded on this account.'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} />
      ) : role === 'teacher' ? (
        <FlatList
          data={teacherEvents}
          keyExtractor={(event) => event.eventId}
          contentContainerStyle={teacherEvents.length === 0 ? styles.emptyList : styles.list}
          renderItem={({ item }) => <TeacherEventCard event={item} />}
          ListEmptyComponent={<Text style={styles.empty}>No events created yet.</Text>}
        />
      ) : (
        <FlatList
          data={studentRecords}
          keyExtractor={(record) => String(record.id)}
          contentContainerStyle={studentRecords.length === 0 ? styles.emptyList : styles.list}
          renderItem={({ item }) => (
            <View style={styles.record}>
              <View style={styles.recordIcon}>
                <Text style={styles.check}>✓</Text>
              </View>
              <View style={styles.recordDetails}>
                <Text style={styles.eventCode} numberOfLines={1}>{item.eventTitle}</Text>
                <Text style={styles.date}>{item.eventId}</Text>
                <Text style={styles.date}>{new Date(item.scannedAt).toLocaleString()}</Text>
              </View>
              <Text style={styles.status}>Recorded</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No attendance scans yet.</Text>}
        />
      )}
    </View>
  );
}

function TeacherEventCard({ event }: { event: TeacherEventAttendance }) {
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={styles.eventHeading}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.date}>{event.eventCode}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{event.attendeeCount}</Text>
          <Text style={styles.countLabel}>attended</Text>
        </View>
      </View>
      <Text style={styles.date}>
        Starts: {event.startTime ? new Date(event.startTime).toLocaleString() : 'Not set'}
      </Text>
      {event.attendees.length === 0 ? (
        <Text style={styles.noAttendees}>No students have scanned this event yet.</Text>
      ) : (
        <View style={styles.attendeeList}>
          {event.attendees.map((attendee) => (
            <View key={`${event.eventId}-${attendee.studentId}-${attendee.scannedAt}`} style={styles.attendeeRow}>
              <Text style={styles.attendeeId}>{attendee.studentName || shortId(attendee.studentId)}</Text>
              <Text style={styles.date}>{new Date(attendee.scannedAt).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'unknown';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 32 },
  header: { marginBottom: 24 },
  eyebrow: { color: COLORS.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: COLORS.textPrimary, fontSize: 30, fontWeight: '800', marginTop: 6 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 6 },
  list: { paddingBottom: 24, gap: 10 },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  record: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  recordIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  check: { color: COLORS.primary, fontSize: 20, fontWeight: '800' },
  recordDetails: { flex: 1, gap: 4 },
  eventCode: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  date: { color: COLORS.textSecondary, fontSize: 12 },
  status: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  empty: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
  eventCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, gap: 10 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  eventHeading: { flex: 1, gap: 4 },
  eventTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
  countBadge: { backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  countText: { color: COLORS.primary, fontSize: 17, fontWeight: '800' },
  countLabel: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  attendeeList: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, gap: 8 },
  attendeeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  attendeeId: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  noAttendees: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
});
