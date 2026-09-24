import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAuth(session: Session | null) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { session: globalSession, user: globalUser, loading: globalLoading };
}

export async function signUp(email: string, password: string, profile?: SignUpProfile) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: Linking.createURL('login'),
      data: profile ? { full_name: profile.full_name, role: profile.role } : undefined,
    },
  });
  // When email confirmation is disabled, data.session is set and we can update the profile directly.
  // When email confirmation is enabled, data.session is null and the DB trigger handle_new_user()
  // will create the profile from raw_user_meta_data (see supabase/schema.sql).
  // We still attempt a direct update when we have an authenticated session for immediate consistency.
  if (!error && data.session && profile) {
    await supabase
      .from('profiles')
      .update({ full_name: profile.full_name, role: profile.role })
      .eq('id', data.session.user.id);
  }
  if (!error && data.session) setAuth(data.session);
  return { data, error };
}

async function syncProfileFromMetadata(user: User) {
  const metaRole = user.user_metadata?.role as string | undefined;
  const metaName = user.user_metadata?.full_name as string | undefined;
  const validRole = metaRole === 'teacher' || metaRole === 'student' ? metaRole : null;
  if (!validRole && !metaName) return;
  // Fetch current profile to avoid overwriting intentional changes unnecessarily
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();
  const needsRoleUpdate = validRole !== null && profile?.role !== validRole;
  const needsNameUpdate = Boolean(metaName && !profile?.full_name && metaName.trim().length > 0);
  if (!needsRoleUpdate && !needsNameUpdate) return;
  const updates: Record<string, string> = {};
  if (needsRoleUpdate) updates.role = validRole!;
  if (needsNameUpdate) updates.full_name = metaName!.trim();
  await supabase.from('profiles').update(updates).eq('id', user.id);
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error && data.session) {
    setAuth(data.session);
    // Repair profiles that were created before handle_new_user respected metadata
    // (user registered as teacher but got default 'student').
    await syncProfileFromMetadata(data.session.user);
  }
  return { data, error };
}

export async function signOut() {
  setAuth(null);
  supabase.auth.signOut().catch(() => undefined);
  return { error: null };
}

export async function completeAuthFromUrl(url: string) {
  const { queryParams } = Linking.parse(url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  if (!code) return false;

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return false;

  setAuth(data.session);
  await syncProfileFromMetadata(data.session.user);
  return true;
}