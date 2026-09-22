import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { createEvent, type Event } from '@/lib/events';
import type { Role } from '@/lib/profiles';
import { getProfile } from '@/lib/profiles';
import { buildQRPayload } from '@/lib/qr';

function toLocalISO(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDateTime(date: Date) {
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function TeacherScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [editTarget, setEditTarget] = useState<'start' | 'end' | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user) {
        setRoleLoading(false);
        return () => {
          active = false;
        };
      }

      setRoleLoading(true);
      void getProfile(user.id).then((profile) => {
        if (!active) return;
        setRole(profile?.role ?? 'student');
        setRoleLoading(false);
      });

      return () => {
        active = false;
      };
    }, [user]),
  );

  const openPicker = (target: 'start' | 'end') => {
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed' || !selectedDate || !editTarget) {
      setEditTarget(null);
      return;
    }

    if (Platform.OS === 'android' && editingPart === 'date') {
      if (editTarget === 'start') setStartDate(selectedDate);
      else setEndDate(selectedDate);
      setEditingPart('time');
      return;
    }

    if (editTarget === 'start') setStartDate(selectedDate);
    else setEndDate(selectedDate);
    setEditTarget(null);
  };

  const setEndOffset = (minutes: number) => {
    setEndDate(new Date(startDate.getTime() + minutes * 60 * 1000));
  };

  const handleCreateEvent = async () => {
    const event: Event = {
      eventId: eventId.trim(),
      title: title.trim(),
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
    };

    if (!event.eventId || !event.title) {
      setMessage('All fields are required.');
      setPayload(null);
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessage('Start time must be before end time.');
      setPayload(null);
      return;
    }

    try {
      const result = await createEvent(event);
      if (result.error) {
        setMessage(result.error);
        setPayload(null);
        return;
      }
      setMessage('Event saved! Scan the QR with the Scan tab to test it.');
      setPayload(buildQRPayload(event));
    } catch {
      setMessage('Could not save the event. Please try again.');
      setPayload(null);
    }
  };

  if (roleLoading) {
    return (
      <View style={styles.lockScreen}>
        <Text style={styles.lockTitle}>Checking your account...</Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.lockScreen}>
        <SymbolView name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} tintColor={COLORS.primary} size={42} />
        <Text style={styles.lockTitle}>Teachers Only</Text>
        <Text style={styles.lockSubtitle}>Only teacher accounts can create events.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>TEACHER EVENT</Text>
      <Text style={styles.title}>Create attendance QR</Text>
      <Text style={styles.subtitle}>Set the event details, save it, and display the QR for students.</Text>
      <View style={styles.form}>
        <Field label="Event title" value={title} onChangeText={setTitle} placeholder="Calculus lecture" />
        <Field label="Event code" value={eventId} onChangeText={setEventId} placeholder="CALC-2026-001" />
        <PickerField label="Starts" value={formatDateTime(startDate)} onPress={() => openPicker('start')} />
        <PickerField label="Ends" value={formatDateTime(endDate)} onPress={() => openPicker('end')} />
        <View style={styles.chipRow}>
          {[30, 60, 120].map((minutes) => (
            <Pressable key={minutes} onPress={() => setEndOffset(minutes)} style={styles.chip}>
              <Text style={styles.chipText}>+{minutes === 60 ? '1 hour' : `${minutes} min`}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {editTarget && <DateTimePicker value={editTarget === 'start' ? startDate : endDate} mode={Platform.OS === 'android' ? editingPart : 'datetime'} display={Platform.OS === 'android' ? 'default' : 'spinner'} onChange={onPickerChange} />}
      <Pressable onPress={handleCreateEvent} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>Create event</Text>
      </Pressable>
      {message && <Text style={styles.message}>{message}</Text>}
      {payload && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Scan this QR with the Scan tab</Text>
          <View style={styles.qrBox}><QRCode value={payload} size={200} /></View>
          <Text style={styles.payloadText}>{payload}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.textSecondary} style={styles.input} /></View>;
}

function PickerField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable onPress={onPress} style={styles.pickerField}><Text style={styles.pickerText}>{value}</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.background, padding: 24 },
  lockScreen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginTop: 14 },
  lockSubtitle: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', marginTop: 8 },
  eyebrow: { color: COLORS.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: 12 },
  title: { color: COLORS.textPrimary, fontSize: 30, fontWeight: '800', marginTop: 6 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 24 },
  form: { gap: 14 },
  field: { gap: 7 },
  label: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  input: { height: 50, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary, backgroundColor: COLORS.card, paddingHorizontal: 14, fontSize: 15 },
  pickerField: { height: 50, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, paddingHorizontal: 14, justifyContent: 'center' },
  pickerText: { color: COLORS.textPrimary, fontSize: 15 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 16, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  button: { height: 52, borderRadius: 12, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  buttonText: { color: COLORS.textOnPrimary, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.72 },
  message: { color: COLORS.textPrimary, textAlign: 'center', marginTop: 16, fontSize: 14 },
  resultCard: { alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, padding: 22, marginTop: 24, gap: 14 },
  resultTitle: { color: COLORS.textPrimary, fontWeight: '700', textAlign: 'center' },
  qrBox: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8 },
  payloadText: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center' },
});
