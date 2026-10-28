import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, KeyRound } from 'lucide-react-native';
import { auth, ApiError } from '@/lib/api';
import { isValidPassword, PASSWORD_HINT } from '@/lib/validation';
import { RESEND_COOLDOWN_SECONDS, useCooldown } from '@/lib/useCooldown';
import { Action, Brand, Entrance, welcome as c } from '@/components/welcome/WelcomeUI';
import { AuthField } from '@/components/welcome/AuthField';
import PasswordResetSuccess from '@/components/welcome/PasswordResetSuccess';

type Stage = 'email' | 'reset' | 'done';
type Operation = 'request' | 'resend' | 'reset' | null;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [requestedEmail, setRequestedEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [operation, setOperation] = useState<Operation>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const resendAfter = useRef(0);
  const scroll = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);
  const cooldown = useCooldown();
  const busy = operation !== null;

  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [stage]);

  const errorMessage = (err: unknown, fallback: string) => {
    if (!(err instanceof ApiError)) return fallback;
    if (err.status === 429) return 'Too many attempts. Please wait a minute before trying again.';
    if (/invalid or expired (otp|code)/i.test(err.message)) return 'That code is invalid or has expired. Check it or request a new code.';
    return err.message;
  };

  const sendCode = async (resend = false) => {
    if (inFlight.current || (resend && (stage !== 'reset' || cooldown.remaining > 0 || Date.now() < resendAfter.current))) return;
    const targetEmail = resend ? requestedEmail : email.trim();
    if (!targetEmail) { setError('Enter the email address you signed up with.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) { setError('Enter a valid email address.'); return; }
    inFlight.current = true;
    setOperation(resend ? 'resend' : 'request');
    setError('');
    setNotice('');
    try {
      // Both request and resend use the password-reset endpoint, never signup OTPs.
      // Success is intentionally generic, including when there is no such account.
      await auth.forgotPassword(targetEmail);
      setRequestedEmail(targetEmail);
      setCode('');
      setStage('reset');
      resendAfter.current = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
      cooldown.start();
      if (resend) setNotice('If this email is registered, a new code is on its way. Use the most recent code.');
    } catch (err) {
      setError(errorMessage(err, 'We could not send a reset code. Check your connection and try again.'));
    } finally { inFlight.current = false; setOperation(null); }
  };

  const submitReset = async () => {
    if (inFlight.current || stage !== 'reset') return;
    if (!/^\d{6}$/.test(code)) { setError('Enter the six-digit code from your email.'); return; }
    if (!isValidPassword(newPassword)) { setError(`${PASSWORD_HINT} Maximum 72 characters.`); return; }
    if (newPassword !== confirmation) { setError('Your passwords do not match. Please check them and try again.'); return; }
    inFlight.current = true;
    setOperation('reset');
    setError('');
    setNotice('');
    try {
      await auth.resetPassword(requestedEmail, code, newPassword);
      setCode('');
      setNewPassword('');
      setConfirmation('');
      setStage('done');
    } catch (err) {
      setError(errorMessage(err, 'We could not reset your password. Check your connection and try again.'));
    } finally { inFlight.current = false; setOperation(null); }
  };

  const changeEmail = () => {
    if (inFlight.current) return;
    setCode(''); setNewPassword(''); setConfirmation(''); setError(''); setNotice('');
    setStage('email');
  };
  const back = () => {
    if (inFlight.current) return;
    if (stage === 'reset') changeEmail();
    else if (stage === 'done') router.replace('/login');
    else if (router.canGoBack()) router.back();
    else router.replace('/login');
  };
  const goToLogin = () => { if (!inFlight.current) router.replace('/login'); };

  const title = stage === 'email' ? 'Forgot your\npassword?' : 'A fresh start.\nA new password.';
  const primaryLabel = stage === 'done' ? 'Back to sign in' : operation === 'request' ? 'Sending code' : operation === 'reset' ? 'Resetting password' : stage === 'email' ? 'Send reset code' : 'Reset password';

  return <SafeAreaView style={styles.screen}>
    <StatusBar barStyle="dark-content" backgroundColor={c.paper} />
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.frame}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={stage === 'reset' ? 'Change email' : 'Back'} disabled={busy} onPress={back} style={styles.back}>
            <ArrowLeft size={21} color={busy ? c.muted : c.ink} />
          </Pressable><Brand />
        </View>
        <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={[styles.content, stage === 'reset' && { paddingTop: 20 }]} keyboardShouldPersistTaps="handled">
          {stage === 'done' ? <Entrance key="done" style={{ flexGrow: 1, flexShrink: 0 }}><PasswordResetSuccess /></Entrance> : <Entrance key={stage} style={stage === 'reset' ? { marginBottom: 24 } : styles.intro}>
            {stage === 'email' && <View style={styles.symbol}>
              <KeyRound size={27} color={c.green} strokeWidth={1.5} />
            </View>}
            <Text style={styles.eyebrow}>{stage === 'email' ? 'ACCOUNT RECOVERY' : 'CHECK YOUR EMAIL'}</Text>
            <Text accessibilityRole="header" style={[styles.title, stage === 'reset' && { fontSize: 36, lineHeight: 40 }]}>{title}</Text>
            <Text style={[styles.description, stage === 'reset' && { fontSize: 13, lineHeight: 20, marginTop: 12 }]}>{stage === 'email' ? 'It happens. Enter your email and we’ll help you get back to your vault.' : 'If an account exists for this email, a six-digit reset code is on its way.'}</Text>
            {stage === 'reset' && <Text style={styles.email}>{requestedEmail}</Text>}
          </Entrance>}
          {stage === 'email' && <AuthField label="Email address" placeholder="you@example.com" value={email}
            onChangeText={value => { setEmail(value); setError(''); }} editable={!busy}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
            returnKeyType="go" onSubmitEditing={() => sendCode()} hint="Use the email address you signed up with." />}
          {stage === 'reset' && <View>
            <AuthField label="Reset code" placeholder="6-digit code" value={code} editable={!busy}
              onChangeText={value => { setCode(value.replace(/\D/g, '').slice(0, 6)); setError(''); }} keyboardType="number-pad" maxLength={6}
              autoComplete="one-time-code" textContentType="oneTimeCode" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
              style={code ? styles.code : undefined} hint="Codes expire after 10 minutes. Check your spam folder too." />
            <View style={styles.resendRow}>
              <Text style={styles.muted}>Didn’t get a code?</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Resend reset code" disabled={cooldown.remaining > 0 || busy} onPress={() => sendCode(true)} style={styles.resend}>
                <Text style={[styles.link, (cooldown.remaining > 0 || busy) && { color: c.muted }]}>{operation === 'resend' ? 'Sending…' : cooldown.remaining > 0 ? `Resend in ${cooldown.remaining}s` : 'Resend code'}</Text>
              </Pressable>
            </View>
            {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
            <AuthField ref={passwordRef} label="New password" password placeholder="New password" value={newPassword} editable={!busy}
              onChangeText={value => { setNewPassword(value); setError(''); }} autoComplete="new-password" textContentType="newPassword"
              returnKeyType="next" onSubmitEditing={() => confirmationRef.current?.focus()} hint={`${PASSWORD_HINT} Maximum 72 characters.`} />
            <AuthField ref={confirmationRef} label="Confirm new password" password placeholder="Confirm new password" value={confirmation} editable={!busy}
              onChangeText={value => { setConfirmation(value); setError(''); }} autoComplete="new-password" textContentType="newPassword"
              returnKeyType="go" onSubmitEditing={submitReset} />
          </View>}
        </ScrollView>
        <View style={styles.footer}>
          {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
          <Action label={primaryLabel} disabled={busy} onPress={stage === 'done' ? goToLogin : stage === 'email' ? () => sendCode() : submitReset}>
            {busy && operation !== 'resend' ? <View style={styles.loading}><ActivityIndicator color={c.white} /><Text style={styles.loadingText}>{primaryLabel}…</Text></View> : undefined}
          </Action>
          {stage !== 'done' && <Pressable accessibilityRole="button" disabled={busy} onPress={stage === 'reset' ? changeEmail : goToLogin} style={styles.secondary}>
            <Text style={styles.secondaryText}>{stage === 'reset' ? 'Use a different email' : 'Remember your password? Sign in'}</Text>
          </Pressable>}
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper }, keyboard: { flex: 1 },
  frame: { flex: 1, width: '100%', maxWidth: 540, alignSelf: 'center' },
  header: { paddingHorizontal: 28, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  scroll: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24 },
  intro: { marginBottom: 30 },
  symbol: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: c.sage, marginBottom: 24 },
  eyebrow: { color: c.green, fontSize: 10, letterSpacing: 1.8, fontWeight: '700', marginBottom: 14 },
  title: { color: c.ink, fontSize: 43, lineHeight: 48, letterSpacing: -1.8, fontWeight: '500', fontStyle: 'italic' },
  description: { color: c.muted, fontSize: 14, lineHeight: 22, marginTop: 16 },
  email: { color: c.ink, fontSize: 14, lineHeight: 22, fontWeight: '600', marginTop: 6 },
  code: { textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: '600' },
  resendRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 6, marginTop: -14, marginBottom: 20 },
  muted: { color: c.muted, fontSize: 12 }, resend: { minHeight: 44, justifyContent: 'center' },
  link: { color: c.green, fontSize: 12, fontWeight: '700' },
  notice: { color: c.green, fontSize: 12, lineHeight: 19, marginTop: -8, marginBottom: 22 },
  footer: { paddingHorizontal: 28, paddingTop: 14, paddingBottom: 16, backgroundColor: c.paper, borderTopColor: c.line, borderTopWidth: StyleSheet.hairlineWidth },
  error: { color: '#A53F30', fontSize: 12, lineHeight: 19, marginBottom: 12 },
  loading: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: c.white, fontSize: 15, fontWeight: '600' },
  secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  secondaryText: { color: c.green, fontSize: 12, fontWeight: '600' },
});
