import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Lock,
  Fingerprint,
  Smartphone,
  Key,
  ShieldCheck,
  RotateCw,
  LogOut,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [biometrics, setBiometrics] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);
  const [dataAnalytics, setDataAnalytics] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const handleRotateKeys = () => {
    setIsRotating(true);
    setTimeout(() => {
      setIsRotating(false);
      Alert.alert(
        'Keys Rotated',
        'Your 256-bit AES cryptographic encryption keys have been regenerated and re-synchronized across the Health Vault.'
      );
    }, 700);
  };

  const handleTerminateSessions = () => {
    Alert.alert(
      'Terminate All Sessions',
      'This will log you out of all other web and mobile devices currently accessing your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate Now',
          style: 'destructive',
          onPress: () => Alert.alert('Sessions Terminated', 'All other active sessions have been signed out.'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Privacy & Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Security Status Card */}
        <View style={[styles.statusCard, { backgroundColor: '#EAF5E2', borderColor: '#B7E0A5' }]}>
          <ShieldCheck size={28} color="#006022" />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>Health Vault Security: Excellent</Text>
            <Text style={styles.statusDesc}>
              Biometrics, 2-Factor Authentication, and 256-bit client-side record encryption are active.
            </Text>
          </View>
        </View>

        {/* Authentication Options */}
        <View style={styles.sectionHeader}>
          <Lock size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Authentication & Access</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Fingerprint size={22} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Biometric Login (FaceID / Fingerprint)</Text>
              <Text style={[styles.rowDesc, { color: theme.textMuted }]}>Unlock app without typing your master password</Text>
            </View>
            <Switch
              value={biometrics}
              onValueChange={setBiometrics}
              trackColor={{ false: '#D0D5DD', true: theme.primaryLight }}
              thumbColor={biometrics ? theme.primary : '#F2F4F7'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <Smartphone size={22} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Two-Factor Authentication (2FA)</Text>
              <Text style={[styles.rowDesc, { color: theme.textMuted }]}>Require SMS code for new logins and record sharing</Text>
            </View>
            <Switch
              value={twoFactor}
              onValueChange={setTwoFactor}
              trackColor={{ false: '#D0D5DD', true: theme.primaryLight }}
              thumbColor={twoFactor ? theme.primary : '#F2F4F7'}
            />
          </View>
        </View>

        {/* Encryption Keys Management */}
        <View style={styles.sectionHeader}>
          <Key size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Cryptographic Key Management</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.keyInfoRow}>
            <View>
              <Text style={[styles.keyLabel, { color: theme.textMuted }]}>ENCRYPTION STANDARD</Text>
              <Text style={[styles.keyValue, { color: theme.text }]}>AES-256-GCM + Curve25519</Text>
            </View>
            <View style={styles.activeKeyBadge}>
              <CheckCircle2 size={12} color="#006022" />
              <Text style={styles.activeKeyBadgeText}>VERIFIED</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRotateKeys}
            style={[styles.rotateBtn, { backgroundColor: theme.primaryLight }]}>
            <RotateCw size={16} color={theme.primary} />
            <Text style={[styles.rotateBtnText, { color: theme.primary }]}>
              {isRotating ? 'Rotating Keys...' : 'Rotate Encryption Keys'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Sessions */}
        <View style={styles.sectionHeader}>
          <Smartphone size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Active Login Sessions</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sessionRow}>
            <View style={[styles.sessionIcon, { backgroundColor: theme.primaryLight }]}>
              <Smartphone size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deviceName, { color: theme.text }]}>iPhone 16 Pro (This Device)</Text>
              <Text style={[styles.deviceSub, { color: theme.textMuted }]}>Cape Town, South Africa • Active Now</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.sessionRow}>
            <View style={[styles.sessionIcon, { backgroundColor: '#F2F4F7' }]}>
              <Smartphone size={18} color="#667085" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deviceName, { color: theme.text }]}>Chrome Browser on macOS</Text>
              <Text style={[styles.deviceSub, { color: theme.textMuted }]}>Johannesburg • 2 days ago</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleTerminateSessions}
            style={[styles.terminateBtn, { borderColor: theme.emergency }]}>
            <LogOut size={16} color={theme.emergency} />
            <Text style={[styles.terminateBtnText, { color: theme.emergency }]}>Terminate All Other Sessions</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusTitle: {
    color: '#006022',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  statusDesc: {
    color: '#137333',
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 11,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  keyInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  keyLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  keyValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  activeKeyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF5E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeKeyBadgeText: {
    color: '#006022',
    fontSize: 10,
    fontWeight: '800',
  },
  rotateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  rotateBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
  },
  deviceSub: {
    fontSize: 11,
    marginTop: 2,
  },
  terminateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 6,
  },
  terminateBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
