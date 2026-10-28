import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Eye, EyeOff, MailCheck } from 'lucide-react-native';
import { genderForApi, GENDER_CHOICES, type GenderChoice, isValidPassword, normalizePhone, parseIsoDob, PASSWORD_HINT } from '@/lib/validation';
import { auth, patients, analytics, setAccessToken, ApiError, type AcquisitionSource } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import { useCooldown } from '@/lib/useCooldown';
import { Action, Brand, Entrance, welcome as c } from '@/components/welcome/WelcomeUI';

const sources = [['social_media', 'Social media'], ['friend', 'Friend'], ['referral', 'Referral'], ['family', 'Family']] as const;
const steps = [
  { name: 'About you', title: 'A healthy start.\nMade for you.', description: 'A few details to set up your health profile.' },
  { name: 'Your account', title: 'Your details.\nYour own vault.', description: 'Choose how you sign in and keep your account secure.' },
  { name: 'Verify email', title: 'One last step.\nThen you’re in.', description: 'Enter the six-digit code we sent to' },
];

export default function SignUpScreen() {
  const router = useRouter();
  const loginStore = useAuthStore(state => state.login);
  const scroll = useRef<ScrollView>(null);
  const submitting = useRef(false);
  const resending = useRef(false);
  const verifiedTokens = useRef<{ accessToken: string; refreshToken: string } | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<GenderChoice | null>(null);
  const [idNumber, setIdNumber] = useState('');
  const [source, setSource] = useState<AcquisitionSource | ''>('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [otp, setOtp] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendNote, setResendNote] = useState('');
  const cooldown = useCooldown();
  const current = steps[step - 1];

  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);
  useEffect(() => { analytics.track('registration_start'); }, []);
  useEffect(() => { analytics.track('registration_step_view', { step: String(step) }); }, [step]);

  const handleNext = async () => {
    if (submitting.current || resending.current) return;
    setError('');
    if (step === 1) {
      if (!fullName.trim()) { setError('Please enter your full name.'); return; }
      if (!parseIsoDob(dob.trim())) { setError('Enter a valid date of birth as YYYY-MM-DD, for example 1992-07-14.'); return; }
      if (!gender) { setError('Please select your gender.'); return; }
      if (!source) { setError('Please select how you first heard about Health Hub Africa.'); return; }
      analytics.track('registration_step_complete', { step: '1' });
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return; }
      if (!isValidPassword(password)) { setError(PASSWORD_HINT); return; }
      if (password !== confirmation) { setError('Your passwords do not match. Please check them and try again.'); return; }
      const normalized = normalizePhone(phone);
      if (!normalized.ok) { setError('Enter a valid phone number, for example +2348012345678.'); return; }
      submitting.current = true;
      setBusy(true);
      try {
        await auth.register(email.trim(), password, normalized.value, fullName.trim(), source as AcquisitionSource);
        analytics.track('otp_requested', { channel: 'email' });
        analytics.track('registration_step_complete', { step: '2' });
        cooldown.start();
        setResendNote('');
        setStep(3);
      } catch (err) {
        analytics.track('registration_error');
        setError(err instanceof ApiError ? err.message : 'We could not create your account. Please try again.');
      } finally { submitting.current = false; setBusy(false); }
      return;
    }
    if (!verifiedTokens.current && !/^\d{6}$/.test(otp)) { setError('Please enter the six-digit code sent to your email.'); return; }
    if (!consent) { setError('Please agree to the Privacy Policy and health record storage to continue.'); return; }
    submitting.current = true;
    setBusy(true);
    try {
      // Verification codes are single-use. Keep the tokens if profile setup needs a retry.
      if (!verifiedTokens.current) {
        verifiedTokens.current = await auth.verifyOtp(email.trim(), otp);
        analytics.track('otp_verify_success');
      }
      const { accessToken, refreshToken } = verifiedTokens.current;
      setAccessToken(accessToken);
      let profile;
      try {
        profile = (await patients.getMyProfile()).data;
      } catch (lookupError) {
        if (!(lookupError instanceof ApiError && lookupError.status === 404)) throw lookupError;
        profile = (await patients.create({
          firstName: fullName.trim().split(/\s+/)[0],
          lastName: fullName.trim().split(/\s+/).slice(1).join(' '),
          dateOfBirth: parseIsoDob(dob.trim()) as string,
          gender: genderForApi(gender as GenderChoice), country: 'Nigeria',
          ...(idNumber.trim() ? { nin: idNumber.trim() } : {}),
        })).data;
      }
      patients.updateOnboardingProgress(3, 'otp_verified').catch(() => {});
      await loginStore(accessToken, refreshToken, {
        id: profile.id, email: profile.user.email, firstName: profile.firstName, lastName: profile.lastName,
        phone: profile.user.phone ?? undefined, avatarUrl: profile.profilePhotoUrl ?? undefined, gender: profile.gender,
      });
      analytics.track('registration_complete', { acquisitionSource: source });
      router.replace('/(tabs)');
    } catch (err) {
      analytics.track(verifiedTokens.current ? 'registration_error' : 'otp_verify_failure');
      setError(err instanceof ApiError ? err.message : 'We could not finish setting up your vault. Please try again.');
    } finally { submitting.current = false; setBusy(false); }
  };

  const resend = async () => {
    if (cooldown.remaining > 0 || resending.current || submitting.current || verifiedTokens.current) return;
    resending.current = true;
    setIsResending(true);
    setResendNote('');
    setError('');
    try {
      await auth.resendOtp(email.trim());
      cooldown.start();
      setResendNote('A new code is on its way. Check your email.');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'We could not resend your code. Please try again.'); }
    finally { resending.current = false; setIsResending(false); }
  };

  const back = () => {
    if (busy || isResending || verifiedTokens.current) return;
    setError('');
    if (step > 1) setStep(value => (value - 1) as 1 | 2);
    else if (router.canGoBack()) router.back();
    else router.replace('/onboarding');
  };

  return <SafeAreaView style={styles.screen}>
    <StatusBar barStyle="dark-content" backgroundColor={c.paper} />
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.frame}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={step === 1 ? 'Back to introduction' : 'Previous step'}
            disabled={busy || isResending || !!verifiedTokens.current} onPress={back} style={styles.back}>
            <ArrowLeft size={21} color={busy || verifiedTokens.current ? c.line : c.ink} />
          </Pressable><Brand />
        </View>
        <View style={styles.progress} accessibilityLabel={`Step ${step} of 3: ${current.name}`}>
          <View style={styles.segments}>{steps.map((item, index) => <View key={item.name} style={[styles.segment, { backgroundColor: index < step ? c.green : c.line }]} />)}</View>
          <View style={styles.stepRow}><Text style={styles.stepText}>STEP 0{step} / 03</Text><Text style={styles.stepName}>{current.name}</Text></View>
        </View>
        <ScrollView ref={scroll} style={styles.scroll} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <Entrance key={step} style={styles.intro}>
            {step === 3 && <View style={styles.mailDisc}><MailCheck size={28} color={c.green} strokeWidth={1.5} /></View>}
            <Text accessibilityRole="header" style={styles.title}>{current.title}</Text>
            <Text style={styles.description}>{current.description}{step === 3 && <Text style={styles.email}>{'\n'}{email.trim()}</Text>}</Text>
          </Entrance>
          {step === 1 && <View>
            <Field label="Full name" placeholder="Your full legal name" value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" autoCapitalize="words" editable={!busy} />
            <Field label="Date of birth" placeholder="YYYY-MM-DD" hint="For example, 1992-07-14" value={dob} onChangeText={setDob} autoCorrect={false} maxLength={10} keyboardType="numbers-and-punctuation" editable={!busy} />
            <Text style={styles.label}>Gender</Text>
            <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Gender">{GENDER_CHOICES.map(({ value, label }) => <Choice key={value} label={label} selected={gender === value} onPress={() => setGender(value)} />)}</View>
            <Field label="National identity number (NIN)" optional placeholder="Enter your NIN" value={idNumber} onChangeText={setIdNumber} autoCapitalize="none" editable={!busy} />
            <Text style={styles.label}>How did you first hear about us?</Text>
            <View style={styles.sourceGrid} accessibilityRole="radiogroup" accessibilityLabel="How you heard about us">{sources.map(([value, label]) => <View key={value} style={styles.sourceItem}><Choice label={label} selected={source === value} onPress={() => setSource(value)} /></View>)}</View>
          </View>}
          {step === 2 && <View>
            <Field label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!busy} />
            <Field label="Phone number" optional placeholder="+2348012345678" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" editable={!busy} />
            <Field label="Create password" placeholder="Choose a strong password" hint={PASSWORD_HINT} password value={password} onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword" editable={!busy} />
            <Field label="Confirm password" placeholder="Re-enter your password" password value={confirmation} onChangeText={setConfirmation} autoComplete="new-password" textContentType="newPassword" editable={!busy} returnKeyType="go" onSubmitEditing={handleNext} />
          </View>}
          {step === 3 && <View>
            <Field label="Verification code" placeholder="000000" value={otp} onChangeText={value => setOtp(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" editable={!busy && !verifiedTokens.current}
              style={styles.code} autoCorrect={false} />
            <View style={styles.resendRow}><Text style={styles.muted}>Didn’t get the email?</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Resend code" onPress={resend}
                disabled={cooldown.remaining > 0 || busy || isResending || !!verifiedTokens.current} style={styles.resend}>
                <Text style={[styles.link, (cooldown.remaining > 0 || busy || isResending || !!verifiedTokens.current) && { color: c.muted }]}>
                  {isResending ? 'Sending…' : cooldown.remaining > 0 ? `Resend in ${cooldown.remaining}s` : 'Resend code'}
                </Text>
              </Pressable>
            </View>
            {!!resendNote && <Text accessibilityLiveRegion="polite" style={styles.note}>{resendNote}</Text>}
            {!!verifiedTokens.current && <Text accessibilityLiveRegion="polite" style={styles.note}>Your email is verified. Retry below to finish setting up your vault.</Text>}
            <View style={styles.consentRow}>
              <Pressable accessibilityRole="checkbox" accessibilityLabel="Agree to Privacy Policy and health record storage" accessibilityState={{ checked: consent }} aria-checked={consent}
                disabled={busy} onPress={() => { if (!consent) analytics.track('terms_accepted', { version: 1 }); setConsent(value => !value); }} style={styles.checkboxTouch}>
                <View style={[styles.checkbox, consent && styles.checked]}>{consent && <Check size={15} color={c.white} strokeWidth={2.5} />}</View>
              </Pressable>
              <Text style={styles.consentText}>I agree to the Privacy Policy and consent to secure storage of my health records.</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Pressable accessibilityRole="link" onPress={() => { analytics.track('privacy_notice_viewed', { version: 1 }); router.push('/privacy-policy'); }} style={styles.policy}><Text style={styles.link}>Read the Privacy Policy</Text></Pressable>
              <Pressable accessibilityRole="link" onPress={() => { analytics.track('terms_viewed', { version: 1 }); router.push('/terms-conditions'); }} style={styles.policy}><Text style={styles.link}>Terms of Service</Text></Pressable>
            </View>
          </View>}
        </ScrollView>
        <View style={styles.footer}>
          {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
          <Action label={busy ? 'Please wait' : step === 1 ? 'Continue' : step === 2 ? 'Send verification code' : verifiedTokens.current ? 'Finish setup' : 'Verify & create account'} disabled={busy || isResending} onPress={handleNext}>
            {busy ? <View style={styles.busy}><ActivityIndicator color={c.white} /><Text style={styles.busyText}>{step === 2 ? 'Sending your code…' : 'Setting up your vault…'}</Text></View> : undefined}
          </Action>
          <Pressable accessibilityRole="button" disabled={busy || isResending} onPress={() => router.push('/login')} style={styles.signIn}>
            <Text style={styles.signInText}>Already have an account? <Text style={styles.link}>Sign in</Text></Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Field({ label, hint, optional, password: isPassword, style, ...props }: TextInputProps & { label: string; hint?: string; optional?: boolean; password?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}{optional && <Text style={styles.optional}>  Optional</Text>}</Text>
    <View style={[styles.inputWrap, focused && styles.focused]}>
      <TextInput {...props} accessibilityLabel={label} placeholderTextColor="#7A877E" secureTextEntry={isPassword ? !visible : props.secureTextEntry}
        autoCapitalize={isPassword ? 'none' : props.autoCapitalize} autoCorrect={isPassword ? false : props.autoCorrect}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }} style={[styles.input, style]} />
      {isPassword && <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onPress={() => setVisible(value => !value)} style={styles.eye}>
        {visible ? <EyeOff size={20} color={c.green} /> : <Eye size={20} color={c.green} />}
      </Pressable>}
    </View>
    {!!hint && <Text style={styles.hint}>{hint}</Text>}
  </View>;
}
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={onPress}
    style={({ pressed }) => [styles.choice, selected && styles.selectedChoice, pressed && { opacity: 0.75 }]}>
    <Text style={[styles.choiceText, selected && { color: c.ink, fontWeight: '700' }]}>{label}</Text>
    {selected && <Check size={14} color={c.green} />}
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper }, keyboard: { flex: 1 },
  frame: { flex: 1, width: '100%', maxWidth: 540, alignSelf: 'center' },
  header: { paddingHorizontal: 28, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  progress: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 12 },
  segments: { flexDirection: 'row', gap: 6 }, segment: { flex: 1, height: 3, borderRadius: 3 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  stepText: { fontSize: 9, letterSpacing: 1.4, color: c.green, fontWeight: '600' }, stepName: { fontSize: 11, color: c.muted },
  scroll: { flex: 1 }, scrollContent: { paddingHorizontal: 28, paddingTop: 16, paddingBottom: 22 },
  intro: { marginBottom: 28 }, title: { fontSize: 39, lineHeight: 44, color: c.ink, fontStyle: 'italic', fontWeight: '500', letterSpacing: -1.7 },
  description: { color: c.muted, fontSize: 14, lineHeight: 22, marginTop: 12 }, email: { color: c.ink, fontWeight: '600' },
  field: { marginBottom: 18 }, label: { fontSize: 12, fontWeight: '600', color: c.ink, marginBottom: 9 }, optional: { color: c.muted, fontWeight: '400', fontSize: 10 },
  inputWrap: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: '#FDFCF7', paddingLeft: 16 },
  focused: { borderColor: c.green, backgroundColor: c.white },
  input: { flex: 1, minWidth: 0, height: 54, fontSize: 14, color: c.ink, paddingRight: 16, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  eye: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  hint: { color: c.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
  choices: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  choice: { flex: 1, minHeight: 44, paddingVertical: 10, paddingHorizontal: 10, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 12 },
  selectedChoice: { backgroundColor: c.sage, borderColor: c.green }, choiceText: { fontSize: 12, color: c.muted },
  sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, sourceItem: { width: '48%' },
  mailDisc: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.sage, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  code: { fontSize: 24, fontWeight: '600', letterSpacing: 10, textAlign: 'center' },
  resendRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 6, marginTop: -6 },
  resend: { minHeight: 44, justifyContent: 'center' }, muted: { color: c.muted, fontSize: 12 },
  note: { color: c.green, fontSize: 12, lineHeight: 19, marginTop: 8 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 24 },
  checkboxTouch: { minHeight: 44, width: 44, justifyContent: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderColor: c.muted, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: c.green, borderColor: c.green }, consentText: { color: c.muted, fontSize: 12, lineHeight: 20, flex: 1, paddingTop: 4 },
  policy: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginLeft: 44 },
  footer: { paddingHorizontal: 28, paddingTop: 12, paddingBottom: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  error: { color: '#A53F30', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  busy: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }, busyText: { color: c.white, fontSize: 14, fontWeight: '600' },
  signIn: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  signInText: { color: c.muted, fontSize: 12 }, link: { color: c.ink, fontSize: 12, fontWeight: '700' },
});
