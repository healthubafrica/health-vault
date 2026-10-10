import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import { auth, ApiError } from '@/lib/api';
import { isValidPassword, PASSWORD_HINT } from '@/lib/validation';
import { useCooldown } from '@/lib/useCooldown';

type Stage = 'email' | 'reset' | 'done';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cooldown = useCooldown();

  const requestCode = async () => {
    if (!email.trim()) {
      setError('Enter the email address you signed up with.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      // The API always answers 200 so it cannot be used to discover accounts.
      await auth.forgotPassword(email.trim());
      setStage('reset');
      cooldown.start();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't send a reset code. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitReset = async () => {
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (!isValidPassword(newPassword)) {
      setError(PASSWORD_HINT);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await auth.resetPassword(email.trim(), code.trim(), newPassword);
      setStage('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't reset your password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ChevronLeft size={22} color="#275E52" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {stage === 'done' ? (
            <View style={styles.doneBox}>
              <CheckCircle2 size={56} color="#275E52" />
              <Text style={styles.title}>Password updated</Text>
              <Text style={styles.sub}>Sign in with your new password.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/login')}>
                <Text style={styles.primaryBtnText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Reset your password</Text>
              <Text style={styles.sub}>
                {stage === 'email'
                  ? "Enter your email and we'll send you a 6-digit reset code."
                  : `If ${email.trim()} is registered, a 6-digit code is on its way. Enter it below with your new password.`}
              </Text>

              {stage === 'email' ? (
                <>
                  <Text style={styles.label}>Email address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#98A2B3"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Reset code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit code"
                    placeholderTextColor="#98A2B3"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={setCode}
                  />
                  <Text style={styles.label}>New password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor="#98A2B3"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <Text style={styles.hint}>{PASSWORD_HINT}</Text>
                  <Text style={styles.label}>Confirm new password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor="#98A2B3"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isLoading}
                onPress={stage === 'email' ? requestCode : submitReset}
                style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>{stage === 'email' ? 'Send reset code' : 'Reset password'}</Text>
                )}
              </TouchableOpacity>

              {stage === 'reset' ? (
                <TouchableOpacity
                  disabled={cooldown.remaining > 0 || isLoading}
                  onPress={requestCode}
                  style={styles.linkBtn}>
                  <Text style={[styles.linkText, cooldown.remaining > 0 && { opacity: 0.5 }]}>
                    {cooldown.remaining > 0 ? `Resend code in ${cooldown.remaining}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 12, paddingTop: Platform.OS === 'android' ? 28 : 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  backText: { color: '#275E52', fontSize: 15, fontWeight: '600' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '800', color: '#101828', marginBottom: 6 },
  sub: { fontSize: 14, color: '#475467', lineHeight: 20, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#344054', marginBottom: 8, marginTop: 12 },
  input: {
    height: 52,
    borderWidth: 1.2,
    borderColor: '#D0D5DD',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#101828',
    backgroundColor: '#FFFFFF',
  },
  hint: { fontSize: 11, color: '#64748B', marginTop: 6 },
  error: { color: '#C0392B', fontSize: 13, marginTop: 14 },
  primaryBtn: {
    height: 54,
    backgroundColor: '#275E52',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  linkBtn: { alignItems: 'center', marginTop: 18, padding: 8 },
  linkText: { color: '#275E52', fontSize: 14, fontWeight: '700' },
  doneBox: { alignItems: 'center', paddingTop: 48, gap: 8 },
});
