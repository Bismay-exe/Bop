/**
 * Auth store — Supabase session + user profile, Google OAuth web flow.
 *
 * Flow (PRD §7):
 *   1. signInWithGoogle() → supabase.auth.signInWithOAuth({ skipBrowserRedirect })
 *   2. open the returned URL in an in-app browser (expo-web-browser)
 *   3. provider redirects back to our deep link (bop://auth-callback) with tokens
 *   4. exchange/setSession → session stored in SecureStore
 *   5. call POST /auth/sync once to upsert the backend profile
 *
 * The access token is exposed via getAccessToken() so the API client can attach
 * it as `Authorization: Bearer <token>` (Phase 2 wiring).
 */
import { create } from 'zustand';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { syncProfile } from '../services/api/endpoints';
import { useCloudLibraryStore } from './cloudLibraryStore';

WebBrowser.maybeCompleteAuthSession();

export interface AuthProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  initializing: boolean;
  signingIn: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncBackendProfile: () => Promise<void>;
}

// Deep-link redirect target registered with Supabase (Dashboard → Auth → URL config).
const redirectTo = AuthSession.makeRedirectUri({ scheme: 'bop', path: 'auth-callback' });

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  initializing: true,
  signingIn: false,
  error: null,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ initializing: false });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      initializing: false,
    });

    // Keep the store in sync with token refreshes / sign-out from any source.
    supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      set({ session, user: session?.user ?? null });
      if (!session) {
        set({ profile: null });
        useCloudLibraryStore.getState().clear();
      }
    });

    if (data.session) {
      get().syncBackendProfile().catch(() => {});
      useCloudLibraryStore.getState().refresh().catch(() => {});
    }
  },

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      set({ error: 'Auth is not configured.' });
      return;
    }
    set({ signingIn: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) {
        set({ signingIn: false });
        return; // user cancelled
      }

      // The redirect URL carries the session in its fragment/query.
      const { params, errorCode } = parseRedirect(result.url);
      if (errorCode) throw new Error(errorCode);

      if (params.access_token && params.refresh_token) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (setErr) throw setErr;
      } else if (params.code) {
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(params.code);
        if (exchErr) throw exchErr;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      set({
        session: sessionData.session,
        user: sessionData.session?.user ?? null,
        signingIn: false,
      });

      await get().syncBackendProfile();
      useCloudLibraryStore.getState().refresh().catch(() => {});
    } catch (e: any) {
      set({ signingIn: false, error: e?.message ?? 'Sign-in failed' });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
    useCloudLibraryStore.getState().clear();
  },

  syncBackendProfile: async () => {
    try {
      const profile = await syncProfile();
      set({ profile });
    } catch (e) {
      // Non-fatal: session is still valid even if the profile upsert hiccups.
      console.warn('[auth] backend profile sync failed', e);
    }
  },
}));

function parseRedirect(url: string): {
  params: Record<string, string>;
  errorCode: string | null;
} {
  const parsed = Linking.parse(url);
  const query = (parsed.queryParams ?? {}) as Record<string, string>;
  // Supabase implicit flow returns tokens in the URL fragment (#...).
  const hashIndex = url.indexOf('#');
  const fragment: Record<string, string> = {};
  if (hashIndex !== -1) {
    for (const pair of url.slice(hashIndex + 1).split('&')) {
      const [k, v] = pair.split('=');
      if (k) fragment[k] = decodeURIComponent(v ?? '');
    }
  }
  const params = { ...query, ...fragment };
  return { params, errorCode: params.error_description || params.error || null };
}

/** Read the current access token for the API client. Returns null if signed out. */
export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
