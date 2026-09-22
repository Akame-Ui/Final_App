import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await signIn(email.trim(), password);
      if (authError) setError(authError.message);
      else router.replace('/(tabs)');
    } catch {
      setError('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>QR ATTENDANCE</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to record your attendance.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="you@school.edu" placeholderTextColor={COLORS.textSecondary} style={styles.input} autoCapitalize="none" keyboardType="email-address" editable={!loading} />
        <Text style={styles.label}>Password</Text>
        <TextInput value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor={COLORS.textSecondary} style={styles.input} secureTextEntry editable={!loading} />

        {error && <Text style={styles.error}>{error}</Text>}
        {loading ? <ActivityIndicator color={COLORS.accent} style={styles.loader} /> : <AppButton theme="primary" title="Sign in" icon="login" onPress={handleLogin} />}

        <Link href={'/register' as RelativePathString} asChild>
          <Pressable><Text style={styles.link}>Don't have an account? Sign up</Text></Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  eyebrow: { color: COLORS.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '700', marginTop: 8 },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 21, marginTop: 8, marginBottom: 32 },
  label: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 14 },
  input: { height: 52, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, color: COLORS.textPrimary, paddingHorizontal: 14, fontSize: 16 },
  error: { color: COLORS.danger, marginVertical: 14 },
  loader: { marginVertical: 18 },
  link: { color: COLORS.primary, textAlign: 'center', fontWeight: '700', marginTop: 24 },
});
