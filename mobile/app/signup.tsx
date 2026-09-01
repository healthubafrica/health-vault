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
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react-native';
import BotanicalBackground from '@/components/BotanicalBackground';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { auth, patients, setAccessToken, ApiError, type AcquisitionSource } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';


export default function SignUpScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const loginStore = useAuthStore((s) => s.login);

  // Current Step: 1 = Personal Details, 2 = Contact & Password, 3 = Medical Aid & OTP
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'female' | 'male' | 'other'>('female');
  const [idNumber, setIdNumber] = useState('');
  const [acquisitionSource, setAcquisitionSource] = useState<AcquisitionSource | ''>('');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [medicalAid, setMedicalAid] = useState('');
  const [memberNumber, setMemberNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Step handlers ────────────────────────────────────────────────────────

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!fullName.trim()) {
        Alert.alert('Required', 'Please enter your full name.');
        return;
      }
      if (!acquisitionSource) {
        Alert.alert('Required', 'Please tell us how you first heard about Health-Hub Africa.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!email.trim() || !password || !confirmPassword) {
        Alert.alert('Required', 'Please fill in all fields.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password mismatch', 'Passwords do not match.');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Weak password', 'Password must be at least 8 characters.');
        return;
      }
      setIsLoading(true);
      try {
        await auth.register(
          email.trim(),
          password,
          phone.trim() || undefined,
          fullName.trim(),
          acquisitionSource as AcquisitionSource,
        );
        setCurrentStep(3);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Registration failed. Please try again.';
        Alert.alert('Registration Error', msg);
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === 3) {
      if (!otpCode || otpCode.length < 6) {
        Alert.alert('Required', 'Please enter the 6-digit code sent to your email.');
        return;
      }
      if (!agreedToTerms) {
        Alert.alert('Consent required', 'Please agree to the Privacy Policy to continue.');
        return;
      }
      setIsLoading(true);
      try {
        // Verify OTP — backend returns new tokens on success
        const tokens = await auth.verifyOtp(email.trim(), otpCode);
        const { accessToken, refreshToken } = tokens;

        // Same reason as login.tsx: must be set before any authenticated
        // request below, or getMyProfile/create both 401 with no token
        // attached and this whole step fails as "session expired".
        setAccessToken(accessToken);

        // Fetch or create patient profile
        let profile;
        try {
          const res = await patients.getMyProfile();
          profile = res.data;
        } catch {
          // Patient profile doesn't exist yet — create it
          const res = await patients.create({
            firstName: fullName.trim().split(' ')[0] ?? fullName.trim(),
            lastName: fullName.trim().split(' ').slice(1).join(' ') || '',
            dateOfBirth: dob || '1990-01-01',
            gender,
            country: 'Nigeria',
          });
          profile = res.data;
        }

        await loginStore(accessToken, refreshToken, {
          id: profile.id,
          email: profile.user.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.user.phone ?? undefined,
          avatarUrl: profile.profilePhotoUrl ?? undefined,
        });

        router.replace('/(tabs)');
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Verification failed. Please try again.';
        Alert.alert('Verification Error', msg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    } else {
      router.back();
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Personal Info';
      case 2:
        return 'Account & Security';
      case 3:
        return 'Medical Aid & Verification';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Banner (Deep Emerald with Botanical Art) */}
      <View style={styles.topBanner}>
        <BotanicalBackground showClover={true} opacity={0.8} />

        <SafeAreaView style={styles.topSafeArea}>
          {/* Header Bar */}
          <View style={styles.topNavRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={22} color="#FFFFFF" />
              <Text style={styles.backBtnText}>
                {currentStep === 1 ? 'Login' : 'Back'}
              </Text>
            </TouchableOpacity>

            <Image
              source={require('@/assets/images/splash-icon.png')}
              style={styles.brandIcon}
              resizeMode="contain"
            />
          </View>

          {/* Heading and Step Progress */}
          <View style={styles.greetingContainer}>
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>
              Step {currentStep} of 3: {getStepTitle()}
            </Text>

            {/* Step Progress Segments */}
            <View style={styles.progressBarRow}>
              <View
                style={[
                  styles.progressSegment,
                  { backgroundColor: currentStep >= 1 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)' },
                ]}
              />
              <View
                style={[
                  styles.progressSegment,
                  { backgroundColor: currentStep >= 2 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)' },
                ]}
              />
              <View
                style={[
                  styles.progressSegment,
                  { backgroundColor: currentStep >= 3 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)' },
                ]}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Bottom Sheet Card */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomCardContainer}>
        <View style={styles.bottomCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.cardScrollContent}>
            
            {/* STEP 1: Personal Profile */}
            {currentStep === 1 && (
              <View style={styles.stepForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Legal Name</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Amara Osei"
                      placeholderTextColor="#98A2B3"
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="DD / MM / YYYY (e.g. 14/07/1992)"
                      placeholderTextColor="#98A2B3"
                      value={dob}
                      onChangeText={setDob}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <View style={styles.genderRow}>
                    {(['female', 'male', 'other'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setGender(g)}
                        activeOpacity={0.8}
                        style={[
                          styles.genderOption,
                          gender === g && styles.genderOptionSelected,
                        ]}>
                        <Text
                          style={[
                            styles.genderOptionText,
                            gender === g && styles.genderOptionTextSelected,
                          ]}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>National ID / Passport Number</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 9207145028087"
                      placeholderTextColor="#98A2B3"
                      value={idNumber}
                      onChangeText={setIdNumber}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>How did you first hear about us?</Text>
                  <View style={styles.sourceGrid}>
                    {([
                      ['social_media', 'Social media'],
                      ['friend', 'Friend'],
                      ['referral', 'Referral'],
                      ['family', 'Family'],
                    ] as const).map(([value, label]) => (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setAcquisitionSource(value)}
                        activeOpacity={0.8}
                        style={[styles.sourceOption, acquisitionSource === value && styles.genderOptionSelected]}>
                        <Text style={[styles.genderOptionText, acquisitionSource === value && styles.genderOptionTextSelected]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* STEP 2: Contact & Password */}
            {currentStep === 2 && (
              <View style={styles.stepForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@example.com"
                      placeholderTextColor="#98A2B3"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="+27 (0) 82 123 4567"
                      placeholderTextColor="#98A2B3"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Create Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.textInput, { paddingRight: 44 }]}
                      placeholder="Minimum 8 characters"
                      placeholderTextColor="#98A2B3"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}>
                      {showPassword ? (
                        <EyeOff size={18} color="#275E52" />
                      ) : (
                        <Eye size={18} color="#275E52" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.textInput, { paddingRight: 44 }]}
                      placeholder="Re-enter password"
                      placeholderTextColor="#98A2B3"
                      secureTextEntry={!showPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* STEP 3: Medical Aid & OTP Verification */}
            {currentStep === 3 && (
              <View style={styles.stepForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Medical Aid Provider (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Discovery Health, Momentum, GEMS"
                      placeholderTextColor="#98A2B3"
                      value={medicalAid}
                      onChangeText={setMedicalAid}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Membership Number</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 981240182"
                      placeholderTextColor="#98A2B3"
                      value={memberNumber}
                      onChangeText={setMemberNumber}
                    />
                  </View>
                </View>

                {/* SMS OTP verification */}
                <View style={styles.otpBox}>
                  <Text style={styles.otpHeading}>SMS Verification Code</Text>
                  <Text style={styles.otpSub}>
                    We sent a 6-digit security code to your mobile phone.
                  </Text>
                  <View style={[styles.inputWrapper, { marginTop: 10 }]}>
                    <TextInput
                      style={[styles.textInput, { textAlign: 'center', letterSpacing: 8, fontSize: 18, fontWeight: '800' }]}
                      placeholder="••••••"
                      placeholderTextColor="#98A2B3"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otpCode}
                      onChangeText={setOtpCode}
                    />
                  </View>
                </View>

                {/* Terms Consent */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAgreedToTerms(!agreedToTerms)}
                  style={styles.termsRow}>
                  <View
                    style={[
                      styles.checkbox,
                      agreedToTerms && styles.checkboxSelected,
                    ]}>
                    {agreedToTerms && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the <Text style={styles.termsBold}>POPIA Privacy Policy</Text> and consent to secure encrypted medical record storage.
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Primary Action Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isLoading}
              onPress={handleNextStep}
              style={styles.loginBtn}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginBtnText}>
                  {currentStep === 3 ? 'Verify & Create Vault' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Bottom Link to Login */}
            <View style={styles.footerLinksRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/login')}>
                <Text style={styles.alreadyHaveText}>
                  Already have an account? <Text style={styles.signInLinkText}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#275E52',
  },
  topBanner: {
    height: '38%',
    backgroundColor: '#275E52',
    position: 'relative',
    justifyContent: 'center',
  },
  topSafeArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 20 : 6,
    paddingBottom: 24,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  brandIcon: {
    width: 36,
    height: 36,
    tintColor: '#FFFFFF',
  },
  greetingContainer: {
    gap: 6,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    color: '#D0E8D0',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  bottomCardContainer: {
    flex: 1,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  cardScrollContent: {
    paddingBottom: 40,
  },
  stepForm: {
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#344054',
    marginBottom: 6,
  },
  inputWrapper: {
    height: 50,
    borderWidth: 1.2,
    borderColor: '#D0D5DD',
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  textInput: {
    fontSize: 14,
    color: '#101828',
    height: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 15,
    padding: 2,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceOption: {
    width: '48%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOption: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOptionSelected: {
    backgroundColor: '#EAF5E2',
    borderColor: '#275E52',
  },
  genderOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#344054',
  },
  genderOptionTextSelected: {
    color: '#275E52',
    fontWeight: '700',
  },
  otpBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  otpHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  otpSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSelected: {
    backgroundColor: '#275E52',
    borderColor: '#275E52',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#475467',
  },
  termsBold: {
    fontWeight: '700',
    color: '#275E52',
  },
  loginBtn: {
    height: 54,
    backgroundColor: '#275E52',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 18,
    shadowColor: '#275E52',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerLinksRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  alreadyHaveText: {
    fontSize: 14,
    color: '#667085',
  },
  signInLinkText: {
    fontWeight: '700',
    color: '#275E52',
  },
});
