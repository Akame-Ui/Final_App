import type { RelativePathString } from 'expo-router';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signOut, useAuth } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const nextProfile = await getProfile(user.id);
    setProfile(nextProfile);
    setDraftName(nextProfile?.full_name ?? '');
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    router.replace('/login' as RelativePathString);
  };

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await updateProfile(user.id, { full_name: draftName.trim() });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setProfile((current) => current ? { ...current, full_name: draftName.trim() } : current);
    setEditing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>ACCOUNT</Text>
      <Text style={styles.title}>My profile</Text>
      <View style={styles.card}>
        <View style={[styles.roleBadge, profile?.role === 'teacher' ? styles.roleBadgeTeacher : styles.roleBadgeStudent]}>
          <Text style={styles.roleBadgeText}>{profile?.role === 'teacher' ? 'Teacher' : 'Student'}</Text>
        </View>
        <Text style={styles.label}>Name</Text>
        {editing ? (
          <View style={styles.nameEditRow}>
            <TextInput value={draftName} onChangeText={setDraftName} style={styles.nameInput} placeholder="Your name" placeholderTextColor={COLORS.textSecondary} editable={!saving} />
            <Pressable onPress={handleSaveName} disabled={saving} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>{saving ? '...' : 'Save'}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setEditing(true)} style={styles.nameRow}>
            <Text style={styles.value}>{profile?.full_name || 'Tap to add your name'}</Text>
            <Text style={styles.editHint}>Edit</Text>
          </Pressable>
        )}
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? 'Unknown account'}</Text>
        <Text style={styles.label}>User ID</Text>
        <Text style={styles.id}>{user?.id ?? 'Not available'}</Text>
      </View>
      {loading ? <ActivityIndicator color={COLORS.accent} /> : <AppButton title="Sign out" icon="logout" onPress={handleSignOut} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  eyebrow: { color: COLORS.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: 12 },
  title: { color: COLORS.textPrimary, fontSize: 30, fontWeight: '800', marginTop: 6, marginBottom: 24 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 18, marginBottom: 24 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  value: { color: COLORS.textPrimary, fontSize: 16 },
  id: { color: COLORS.textSecondary, fontSize: 11 },
  roleBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8 },
  roleBadgeTeacher: { backgroundColor: COLORS.accent },
  roleBadgeStudent: { backgroundColor: COLORS.surface },
  roleBadgeText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  nameInput: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, color: COLORS.textPrimary, paddingHorizontal: 12 },
  saveButton: { backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  saveButtonText: { color: COLORS.textOnPrimary, fontWeight: '800' },
  editHint: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
});
