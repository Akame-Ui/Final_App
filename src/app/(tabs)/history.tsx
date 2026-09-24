import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { getAttendanceHistory, getTeacherEventAttendance, type AttendanceRecord, type TeacherEventAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/profiles';
import { getProfile } from '@/lib/profiles';
import { clearScanHistory, getScanHistory, type ScanHistoryEntry } from '@/lib/scanHistory';

type Tab = 'attendance' | 'scans';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [scanEntries, setScanEntries] = useState<ScanHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('attendance');

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const profile = await getProfile(user.id);
    const currentRole = profile?.role ?? 'student';
    setRole(currentRole);

    // Always load local scan history (every QR scanned, not just attendance)
    const scans = await getScanHistory(user.id);

    if (currentRole === 'teacher') {
      const events = await getTeacherEventAttendance(user.id);
      setTeacherEvents(events);
      setStudentRecords([]);
      setScanEntries(scans);
    } else {
      const records = await getAttendanceHistory(user.id);
      setStudentRecords(records);
      setTeacherEvents([]);
      setScanEntries(scans);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleClearScans = useCallback(async () => {
    if (!user) return;
    await clearScanHistory(user.id);
    setScanEntries([]);
  }, [user]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ATTENDANCE</Text>
        <Text style={styles.title}>{role === 'teacher' ? 'Event attendance' : 'Scan history'}</Text>
        <Text style={styles.subtitle}>
          {role === 'teacher'
            ? 'Attendance for events you created + every QR you scanned.'
            : 'Every QR you scan is saved here — attendance and general codes.'}
        </Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setTab('attendance')}
          style={[styles.tab, tab === 'attendance' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === 'attendance' && styles.tabTextActive]}>
            {role === 'teacher' ? 'Events' : 'Attendance'}
          </Text>
        </Pressable>
        <Pressable onPress={() => setTab('scans')} style={[styles.tab, tab === 'scans' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'scans' && styles.tabTextActive]}>
            Scan Detected ({scanEntries.length})
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} />
      ) : tab === 'scans' ? (
        <FlatList
          data={scanEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={scanEntries.length === 0 ? styles.emptyList : styles.list}
          renderItem={({ item }) => <ScanEntryCard entry={item} />}
          ListEmptyComponent={<Text style={styles.empty}>No scans yet. Scan any QR — it will appear here.</Text>}
          ListHeaderComponent={
            scanEntries.length > 0 ? (
              <View style={styles.clearRow}>
                <Pressable onPress={handleClearScans} style={styles.clearButton}>
                  <Text style={styles.clearText}>Clear history</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
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
                <Text style={styles.eventCode} numberOfLines={1}>
                  {item.eventTitle}
                </Text>
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

function ScanEntryCard({ entry }: { entry: ScanHistoryEntry }) {
  const isAttendance = entry.isAttendanceQR;
  const isGenericSuccess = !isAttendance && entry.success;
  return (
    <View style={styles.record}>
      <View
        style={[
          styles.recordIcon,
          isAttendance ? styles.iconAttendance : isGenericSuccess ? styles.iconDetected : styles.iconGeneric,
        ]}
      >
        <Text style={[styles.check, !isAttendance && isGenericSuccess && styles.checkDetected]}>
          {isAttendance ? '✓' : isGenericSuccess ? '◎' : '◈'}
        </Text>
      </View>
      <View style={styles.recordDetails}>
        <Text style={styles.eventCode} numberOfLines={1}>
          {isAttendance ? (entry.eventTitle ?? entry.eventCode ?? 'Attendance QR') : 'Scan detected'}
        </Text>
        <Text style={styles.date} numberOfLines={3}>
          {entry.rawData}
        </Text>
        <Text style={styles.date}>{new Date(entry.scannedAt).toLocaleString()}</Text>
        <Text
          style={[
            styles.badge,
            isAttendance ? styles.badgeAttendance : isGenericSuccess ? styles.badgeDetected : styles.badgeGeneric,
          ]}
        >
          {entry.resultMessage}
        </Text>
      </View>
      <Text style={styles.status}>{isAttendance ? 'Event' : 'Detected'}</Text>
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
      <Text style={styles.date}>Starts: {event.startTime ? new Date(event.startTime).toLocaleString() : 'Not set'}</Text>
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
  header: { marginBottom: 16 },
  eyebrow: { color: COLORS.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: COLORS.textPrimary, fontSize: 30, fontWeight: '800', marginTop: 6 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 6 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16, backgroundColor: COLORS.card, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: COLORS.primary },
  clearRow: { alignItems: 'flex-end', marginBottom: 8 },
  clearButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  clearText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  list: { paddingBottom: 24, gap: 10 },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  record: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  recordIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  iconAttendance: { backgroundColor: COLORS.accent },
  iconGeneric: { backgroundColor: COLORS.border, borderWidth: 1, borderColor: COLORS.accent },
  iconDetected: { backgroundColor: COLORS.success, borderWidth: 1, borderColor: COLORS.accent },
  check: { color: COLORS.primary, fontSize: 16, fontWeight: '800' },
  checkDetected: { color: COLORS.card },
  recordDetails: { flex: 1, gap: 4 },
  eventCode: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  date: { color: COLORS.textSecondary, fontSize: 12 },
  badge: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  badgeAttendance: { color: COLORS.success ?? COLORS.accent },
  badgeDetected: { color: COLORS.success },
  badgeGeneric: { color: COLORS.textSecondary },
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
