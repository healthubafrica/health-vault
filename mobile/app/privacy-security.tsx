import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Lock, KeyRound, LogOut, Fingerprint, FileText, Trash2 } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { auth, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import { isValidPassword, PASSWORD_HINT } from '@/lib/validation';
import { ErrorState, EmptyAnimation } from '@/components/states';

// Everything on this screen is backed by a real endpoint. (The previous version
// showed "Security: Excellent", fake devices, an AES key-rotation button and a
// "sessions terminated" message that did nothing.)
export default function PrivacySecurityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const isBiometricEnrolled = useAuthStore((s) => s.isBiometricEnrolled);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => auth.listSessions() });

  const changePassword = useMutation({
    mutationFn: () => auth.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Password changed', 'Your password has been updated.');
    },
    onError: (err: unknown) => Alert.alert('Could not change password', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const submitPassword = () => {
    if (!currentPassword) {
      Alert.alert('Current password', 'Enter your current password.');
      return;
    }
    if (!isValidPassword(newPassword)) {
      Alert.alert('Weak password', PASSWORD_HINT);
      return;
    }
    changePassword.mutate();
  };

  const signOutEverywhere = () => {
    Alert.alert('Sign out of all devices', 'You will be signed out here and on every other phone or browser.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out everywhere',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth.logoutAll();
          } catch (err) {
            Alert.alert('Could not sign out', err instanceof ApiError ? err.message : 'Please try again.');
            return;
          }
          await logout();
        },
      },
    ]);
  };

  const [deletePassword, setDeletePassword] = useState('');
  const deleteAccount = useMutation({
    mutationFn: () => auth.deleteAccount(deletePassword),
    onSuccess: async () => {
      setDeletePassword('');
      await logout();
      Alert.alert('Account deleted', 'Your account has been deleted and you have been signed out.');
    },
    onError: (err: unknown) => Alert.alert('Could not delete account', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const confirmDeleteAccount = () => {
    if (!deletePassword) {
      Alert.alert('Password required', 'Enter your password to delete your account.');
      return;
    }
    Alert.alert(
      'Delete your account?',
      'You will be signed out on every device and will no longer be able to sign in. Contact support if you change your mind.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => deleteAccount.mutate() },
      ],
    );
  };

  const sessionList = sessions.data?.data ?? [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Privacy & Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sign-in security */}
        <View style={styles.sectionHeader}>
          <Lock size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Sign-in security</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Fingerprint size={22} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Device biometrics</Text>
              <Text style={[styles.rowDesc, { color: theme.textMuted }]}>
                {isBiometricEnrolled
                  ? 'Your fingerprint or face is required to reopen the app. Manage it in your phone settings.'
                  : 'No fingerprint or face is set up on this phone. Add one in your phone settings to lock the app.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Change password */}
        <View style={styles.sectionHeader}>
          <KeyRound size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Change password</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 16, gap: 10 }]}>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="Current password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="New password (12+ characters)"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={changePassword.isPending}
            onPress={submitPassword}
            style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: changePassword.isPending ? 0.6 : 1 }]}>
            <Text style={styles.primaryBtnText}>{changePassword.isPending ? 'Updating…' : 'Update password'}</Text>
          </TouchableOpacity>
        </View>

        {/* Active sessions (real) */}
        <View style={styles.sectionHeader}>
          <LogOut size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Signed-in devices</Text>
        </View>
        {sessions.isError ? (
          <ErrorState onRetry={() => sessions.refetch()} />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {sessions.isLoading ? (
              <ActivityIndicator color={theme.primary} style={{ margin: 16 }} />
            ) : sessionList.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 16 }}>
                <EmptyAnimation name="security" size={96} />
                <Text style={[styles.rowDesc, { color: theme.textMuted }]}>No active sessions.</Text>
              </View>
            ) : (
              sessionList.map((s, i) => (
                <View key={s.id}>
                  {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.text }]}>
                        {s.userAgent || 'Unknown device'}
                      </Text>
                      <Text style={[styles.rowDesc, { color: theme.textMuted }]}>
                        Signed in {new Date(s.createdAt).toLocaleDateString()} {s.ipAddress ? `· ${s.ipAddress}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
            <TouchableOpacity activeOpacity={0.8} onPress={signOutEverywhere} style={styles.terminateBtn}>
              <Text style={[styles.terminateBtnText, { color: theme.emergency }]}>Sign out of all devices</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Data & consent */}
        <View style={styles.sectionHeader}>
          <FileText size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Your data</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/consents')} style={styles.linkRow}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Manage consents (sharing, analytics, marketing)</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/privacy-policy')} style={styles.linkRow}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Privacy policy</Text>
          </TouchableOpacity>
        </View>

        {/* Delete account */}
        <View style={styles.sectionHeader}>
          <Trash2 size={18} color={theme.emergency} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Delete account</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 16, gap: 10 }]}>
          <Text style={[styles.rowDesc, { color: theme.textMuted, marginTop: 0 }]}>
            Deleting your account signs you out everywhere and stops you signing in again.
          </Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="Confirm with your password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={deletePassword}
            onChangeText={setDeletePassword}
            accessibilityLabel="Password to confirm account deletion"
          />
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={deleteAccount.isPending}
            onPress={confirmDeleteAccount}
            accessibilityRole="button"
            style={[styles.primaryBtn, { backgroundColor: theme.emergency, opacity: deleteAccount.isPending ? 0.6 : 1 }]}>
            <Text style={styles.primaryBtnText}>{deleteAccount.isPending ? 'Deleting…' : 'Delete my account'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '800' },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 48 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowDesc: { fontSize: 12, marginTop: 2 },
  divider: { height: 1 },
  linkRow: { padding: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  terminateBtn: { padding: 16, alignItems: 'center' },
  terminateBtnText: { fontSize: 14, fontWeight: '700' },
});
