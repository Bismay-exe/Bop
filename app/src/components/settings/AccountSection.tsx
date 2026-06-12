/**
 * Account section for the Settings screen — sign in / out + profile summary.
 * Uses the existing SettingSection / SettingRow design language.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants';
import { useAuthStore } from '../../store/authStore';
import SettingSection from './SettingSection';

export default function AccountSection() {
  const { user, profile, session, signingIn, error, signInWithGoogle, signOut } = useAuthStore();

  const isSignedIn = Boolean(session);
  const displayName =
    profile?.display_name ?? user?.user_metadata?.full_name ?? 'Music Lover';
  const email = profile?.email ?? user?.email ?? '';
  const avatar = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SettingSection title="Account">
      {isSignedIn ? (
        <View>
          <View style={styles.profileRow}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={26} color={Colors.textSecondary} />
              </View>
            )}
            <View style={styles.profileText}>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              {!!email && <Text style={styles.email} numberOfLines={1}>{email}</Text>}
            </View>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={confirmSignOut} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={signInWithGoogle}
            disabled={signingIn}
            activeOpacity={0.8}
          >
            {signingIn ? (
              <ActivityIndicator color={Colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={Colors.textPrimary} />
                <Text style={styles.signInText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.hint}>
            Sign in to sync your liked songs, playlists, and history across devices.
          </Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      )}
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.background,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  email: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  signOutText: {
    ...Typography.body,
    color: Colors.error,
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  signInText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  error: {
    ...Typography.caption,
    color: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
});
