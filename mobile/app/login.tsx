import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react-native';
import { auth, patients, setAccessToken, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import { Action, Brand, Entrance, welcome as c } from '@/components/welcome/WelcomeUI';

export default function LoginScreen() {
  const router = useRouter();
  const loginStore = useAuthStore(state => state.login);
  const passwordRef = useRef<TextInput>(null);
  const submitting = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (submitting.current) return;
    if (!email.trim() || !password) { setError('Please enter your email address and password.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return; }
    submitting.current = true;
    setIsLoading(true);
    setError('');
    try {
      const result = await auth.login(email.trim(), password);
      // The profile request needs this token before the persisted session exists.
      setAccessToken(result.accessToken);
      const { data: profile } = await patients.getMyProfile();
      await loginStore(result.accessToken, result.refreshToken, {
        id: profile.id, email: profile.user.email, firstName: profile.firstName,
        lastName: profile.lastName, phone: profile.user.phone ?? undefined,
        avatarUrl: profile.profilePhotoUrl ?? undefined, gender: profile.gender,
      });
      router.replace('/(tabs)');
    } catch (err) {
      setAccessToken(null);
      setError(err instanceof ApiError ? err.message : 'We could not sign you in. Please try again.');
    } finally { submitting.current = false; setIsLoading(false); }
  };

  return <SafeAreaView style={styles.screen}>
    <StatusBar barStyle="dark-content" backgroundColor={c.paper} />
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to introduction"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/onboarding')} style={styles.back}>
            <ArrowLeft size={21} color={c.ink} />
          </Pressable>
          <Brand />
        </View>
        <Entrance style={styles.intro}>
          <View style={styles.symbol}><LockKeyhole size={27} color={c.green} strokeWidth={1.4} /></View>
          <Text style={styles.eyebrow}>YOUR VAULT IS RIGHT HERE</Text>
          <Text style={styles.title} accessibilityRole="header">Welcome{'\n'}back.</Text>
          <Text style={styles.subtitle}>Sign in to pick up where you left off.</Text>
        </Entrance>
        <View style={styles.form}>
          <Text nativeID="email-label" style={styles.label}>Email address</Text>
          <View style={[styles.inputWrap, focused === 'email' && styles.focused]}>
            <Mail size={19} color={c.muted} strokeWidth={1.5} />
            <TextInput accessibilityLabel="Email address" accessibilityLabelledBy="email-label"
              placeholder="you@example.com" placeholderTextColor="#7A877E" keyboardType="email-address"
              autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
              value={email} onChangeText={value => { setEmail(value); setError(''); }} style={styles.input}
              onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} editable={!isLoading}
              returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
          </View>
          <View style={styles.passwordHeading}>
            <Text nativeID="password-label" style={styles.label}>Password</Text>
            <Pressable accessibilityRole="button" disabled={isLoading} style={styles.forgot}
              onPress={() => router.push({ pathname: '/reset-password', params: { email: email.trim() } } as never)}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>
          <View style={[styles.inputWrap, focused === 'password' && styles.focused]}>
            <LockKeyhole size={19} color={c.muted} strokeWidth={1.5} />
            <TextInput ref={passwordRef} accessibilityLabel="Password" accessibilityLabelledBy="password-label"
              placeholder="Enter your password" placeholderTextColor="#7A877E" secureTextEntry={!showPassword}
              autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password"
              value={password} onChangeText={value => { setPassword(value); setError(''); }} style={styles.input}
              onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} editable={!isLoading}
              returnKeyType="go" onSubmitEditing={handleLogin} />
            <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityState={{ selected: showPassword }} onPress={() => setShowPassword(value => !value)} style={styles.eye}>
              {showPassword ? <EyeOff size={20} color={c.green} /> : <Eye size={20} color={c.green} />}
            </Pressable>
          </View>
          {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
          <View style={styles.submit}>
            <Action label={isLoading ? 'Signing in' : 'Sign in'} disabled={isLoading} onPress={handleLogin}>
              {isLoading ? <View style={styles.busy}><ActivityIndicator color={c.white} /><Text style={styles.busyText}>Signing in…</Text></View> : undefined}
            </Action>
          </View>
          <Pressable accessibilityRole="button" disabled={isLoading} onPress={() => router.push('/signup')} style={styles.signup}>
            <Text style={styles.signupText}>New to MyHealth Vault+? <Text style={styles.link}>Create account</Text></Text>
          </Pressable>
        </View>
        <View style={styles.bottom}>
          <View style={styles.reassurance}><ShieldCheck size={16} color={c.green} strokeWidth={1.5} />
            <Text style={styles.reassuranceText}>Your health is personal. Your vault is too.</Text></View>
          <View style={styles.legal}>
            <Pressable accessibilityRole="link" onPress={() => router.push('/privacy-policy')} style={styles.legalLink}><Text style={styles.legalText}>Privacy policy</Text></Pressable>
            <Text style={styles.legalText}>·</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/terms-conditions')} style={styles.legalLink}><Text style={styles.legalText}>Terms of use</Text></Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  intro: { paddingTop: 34, paddingBottom: 30 },
  symbol: { height: 56, width: 56, backgroundColor: c.sage, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  eyebrow: { fontSize: 10, color: c.green, letterSpacing: 1.8, fontWeight: '700', marginBottom: 12 },
  title: { fontSize: 58, lineHeight: 60, color: c.ink, letterSpacing: -2.6, fontStyle: 'italic', fontWeight: '500' },
  subtitle: { color: c.muted, fontSize: 15, lineHeight: 23, marginTop: 14 },
  form: { paddingBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: c.ink, marginBottom: 9 },
  inputWrap: { minHeight: 58, paddingLeft: 17, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FDFCF7', borderColor: c.line, borderWidth: 1, borderRadius: 15 },
  focused: { borderColor: c.green, backgroundColor: c.white },
  input: { flex: 1, minWidth: 0, height: 56, fontSize: 15, color: c.ink, paddingRight: 12, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  passwordHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  forgot: { minHeight: 44, justifyContent: 'center', paddingLeft: 10, marginTop: -9 },
  forgotText: { fontSize: 12, color: c.green, fontWeight: '600' },
  eye: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#A53F30', fontSize: 13, lineHeight: 20, marginTop: 12 },
  submit: { marginTop: 24 },
  busy: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  busyText: { color: c.white, fontSize: 16, fontWeight: '600' },
  signup: { minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  signupText: { fontSize: 12, color: c.muted, textAlign: 'center', lineHeight: 20 },
  link: { color: c.ink, fontWeight: '700' },
  bottom: { flex: 1, justifyContent: 'flex-end', paddingTop: 8, paddingBottom: 10 },
  reassurance: { borderTopColor: c.line, borderTopWidth: 1, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  reassuranceText: { fontSize: 11, color: c.muted, flexShrink: 1 },
  legal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  legalLink: { minHeight: 44, justifyContent: 'center' },
  legalText: { fontSize: 10, color: c.muted },
});
