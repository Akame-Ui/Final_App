import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) return setError('All fields are required.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      const { data, error: authError } = await signUp(email.trim(), password, {
        full_name: fullName.trim(),
        role,
      });
      if (authError) setError(authError.message);
      else if (data.session) router.replace('/(tabs)');
      else setSuccess(true);
    } catch {
      setError('Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>QR ATTENDANCE</Text>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Register to start recording attendance.</Text>
        {success ? (
          <Pressable onPress={() => router.replace('/login' as RelativePathString)} style={styles.successCard}>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successText}>Confirm your account, then return to sign in.</Text>
          </Pressable>
        ) : (
          <>
            <Text style={styles.label}>Full name</Text>
            <TextInput value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor={COLORS.textSecondary} style={styles.input} autoCapitalize="words" editable={!loading} />
            <Text style={styles.label}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="you@school.edu" placeholderTextColor={COLORS.textSecondary} style={styles.input} autoCapitalize="none" keyboardType="email-address" editable={!loading} />
            <Text style={styles.label}>Password</Text>
            <TextInput value={password} onChangeText={setPassword} placeholder="At least 6 characters" placeholderTextColor={COLORS.textSecondary} style={styles.input} secureTextEntry editable={!loading} />
            <Text style={styles.label}>Confirm password</Text>
            <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat your password" placeholderTextColor={COLORS.textSecondary} style={styles.input} secureTextEntry editable={!loading} />
            <Text style={styles.label}>I am a...</Text>
            <View style={styles.roleRow}>
              {(['student', 'teacher'] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setRole(option)}
                  style={[styles.roleChip, role === option && styles.roleChipActive]}
                  disabled={loading}
                >
                  <Text style={[styles.roleChipText, role === option && styles.roleChipTextActive]}>
                    {option === 'student' ? 'Student' : 'Teacher'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
            {loading ? <ActivityIndicator color={COLORS.accent} style={styles.loader} /> : <AppButton theme="primary" title="Sign up" icon="register" onPress={handleRegister} />}
          </>
        )}
        <Link href={'/login' as RelativePathString} asChild><Pressable><Text style={styles.link}>Already have an account? Sign in</Text></Pressable></Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  eyebrow: { color: COLORS.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '700', marginTop: 8 },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 21, marginTop: 8, marginBottom: 26 },
  label: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 14 },
  input: { height: 52, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, color: COLORS.textPrimary, paddingHorizontal: 14, fontSize: 16 },
  error: { color: COLORS.danger, marginVertical: 14 },
  loader: { marginVertical: 18 },
  link: { color: COLORS.primary, textAlign: 'center', fontWeight: '700', marginTop: 24 },
  successCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 20, alignItems: 'center' },
  successTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  successText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  roleRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  roleChip: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 13, alignItems: 'center', backgroundColor: COLORS.card },
  roleChipActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}14` },
  roleChipText: { color: COLORS.textSecondary, fontWeight: '700' },
  roleChipTextActive: { color: COLORS.primary, fontWeight: '700' },
});
