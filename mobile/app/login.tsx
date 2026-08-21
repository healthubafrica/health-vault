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
import { Eye, EyeOff } from 'lucide-react-native';
import BotanicalBackground from '@/components/BotanicalBackground';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { auth, patients, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const loginStore = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Forgot Password ───────────────────────────────────────────────────────

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Enter your registered email address to receive a reset code:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Code',
          onPress: async () => {
            if (!email.trim()) {
              Alert.alert('Email required', 'Please enter your email address first.');
              return;
            }
            try {
              await auth.forgotPassword(email.trim());
              Alert.alert('Check your email', 'A password reset code has been sent to your inbox.');
            } catch (err) {
              const msg = err instanceof ApiError ? err.message : 'Failed to send reset code.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  // ── Login ─────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await auth.login(email.trim(), password);

      if ('requiresTwoFactor' in result) {
        // OTP required — navigate to OTP verification screen
        Alert.alert('OTP Required', 'A one-time code has been sent to your email/phone.');
        // TODO: navigate to OTP screen when built
        setIsLoading(false);
        return;
      }

      const { accessToken, refreshToken } = result;

      // Fetch full patient profile
      const { data: profile } = await patients.getMyProfile();

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
      const msg = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      Alert.alert('Sign In Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Banner */}
      <View style={styles.topBanner}>
        <BotanicalBackground showClover={true} opacity={0.8} />
        <SafeAreaView style={styles.topSafeArea}>
          <View style={styles.logoRow}>
            <Image
              source={require('@/assets/images/splash-icon.png')}
              style={styles.brandIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.greetingContainer}>
            <Text style={styles.welcomeTitle}>Welcome</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to continue</Text>
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

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#98A2B3"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.textInput, { paddingRight: 44 }]}
                  placeholder="Enter your password"
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

            {/* Login Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isLoading}
              onPress={handleLogin}
              style={[styles.loginBtn, isLoading && { opacity: 0.7 }]}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Footer Links */}
            <View style={styles.footerLinksRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/signup')}>
                <Text style={styles.signUpLinkText}>Create account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordLinkText}>Forgot Password?</Text>
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
    height: '46%',
    backgroundColor: '#275E52',
    position: 'relative',
    justifyContent: 'center',
  },
  topSafeArea: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? 24 : 10,
  },
  logoRow: {
    marginBottom: 20,
  },
  brandIcon: {
    width: 44,
    height: 44,
    tintColor: '#FFFFFF',
  },
  greetingContainer: {
    gap: 4,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  welcomeSubtitle: {
    color: '#D0E8D0',
    fontSize: 15,
    fontWeight: '500',
  },
  bottomCardContainer: {
    flex: 1,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  cardScrollContent: {
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#344054',
    marginBottom: 8,
  },
  inputWrapper: {
    height: 52,
    borderWidth: 1.2,
    borderColor: '#D0D5DD',
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  textInput: {
    fontSize: 15,
    color: '#101828',
    height: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 16,
    padding: 2,
  },
  loginBtn: {
    height: 54,
    backgroundColor: '#275E52',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 28,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  signUpLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#275E52',
  },
  forgotPasswordLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#275E52',
  },
});
