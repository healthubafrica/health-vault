import React, { useState, useEffect } from 'react';
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
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  QrCode,
  Key,
  ShieldCheck,
  Clock,
  RefreshCw,
  Share2,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function ShareRecordsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Expiration countdown in seconds (15 minutes = 900s)
  const [timeLeft, setTimeLeft] = useState(840);
  const [accessPin, setAccessPin] = useState('749 201');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Granular Access Permissions
  const [shareVitals, setShareVitals] = useState(true);
  const [shareLabs, setShareLabs] = useState(true);
  const [shareMedications, setShareMedications] = useState(true);
  const [shareNotes, setShareNotes] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRegenerate = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const newPin = `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
      setAccessPin(newPin);
      setTimeLeft(900);
      setIsRefreshing(false);
      Alert.alert('New Access Code', 'A new secure session PIN and QR token have been generated.');
    }, 400);
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Health Hub Africa Temporary Vault Access Code: ${accessPin} (Valid for ${formatTime(timeLeft)}). Verify at https://vault.healthhub.africa/verify`,
      });
    } catch (err) {
      console.error(err);
    }
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
        <Text style={[styles.title, { color: theme.text }]}>Share My Records</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleShareLink}
          style={styles.shareIconBtn}>
          <Share2 size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Security Banner */}
        <View style={[styles.securityBanner, { backgroundColor: '#EAF5E2', borderColor: '#B7E0A5' }]}>
          <ShieldCheck size={20} color="#006022" />
          <View style={{ flex: 1 }}>
            <Text style={styles.securityBannerTitle}>End-to-End Encrypted Access</Text>
            <Text style={styles.securityBannerDesc}>
              Clinicians scan your QR code or enter this single-use PIN for temporary emergency access.
            </Text>
          </View>
        </View>

        {/* QR & PIN Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.badgeRow}>
              <View style={[styles.liveDot, { backgroundColor: '#137333' }]} />
              <Text style={[styles.badgeText, { color: '#137333' }]}>LIVE SESSION</Text>
            </View>
            <View style={styles.timerRow}>
              <Clock size={14} color={theme.textMuted} />
              <Text style={[styles.timerText, { color: theme.textMuted }]}>
                Expires in <Text style={{ color: theme.primary, fontWeight: '800' }}>{formatTime(timeLeft)}</Text>
              </Text>
            </View>
          </View>

          {/* QR Code Container Simulation */}
          <View style={styles.qrContainer}>
            <View style={styles.qrBox}>
              <QrCode size={180} color="#1D2939" strokeWidth={1.5} />
            </View>
            <Text style={[styles.qrHelperText, { color: theme.textMuted }]}>
              Show this QR code to your doctor or paramedic
            </Text>
          </View>

          {/* Emergency PIN Row */}
          <View style={styles.pinSection}>
            <Text style={[styles.pinLabel, { color: theme.textMuted }]}>6-DIGIT EMERGENCY PIN</Text>
            <View style={[styles.pinBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Key size={18} color={theme.primary} />
              <Text style={[styles.pinCode, { color: theme.text }]}>{accessPin}</Text>
            </View>
          </View>

          {/* Regenerate Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRegenerate}
            style={[styles.regenerateBtn, { backgroundColor: theme.primaryLight }]}>
            <RefreshCw size={16} color={theme.primary} />
            <Text style={[styles.regenerateBtnText, { color: theme.primary }]}>
              {isRefreshing ? 'Regenerating...' : 'Regenerate Code & QR'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Permissions Controls */}
        <View style={styles.sectionHeader}>
          <Lock size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Permission Controls</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, paddingVertical: 8 }]}>
          <View style={styles.permRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.permTitle, { color: theme.text }]}>Vital Signs & Telemetry</Text>
              <Text style={[styles.permDesc, { color: theme.textMuted }]}>Blood pressure, heart rate, oxygen levels</Text>
            </View>
            <Switch
              value={shareVitals}
              onValueChange={setShareVitals}
              trackColor={{ false: '#D0D5DD', true: theme.primaryLight }}
              thumbColor={shareVitals ? theme.primary : '#F2F4F7'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.permRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.permTitle, { color: theme.text }]}>Lab & Diagnostic Results</Text>
              <Text style={[styles.permDesc, { color: theme.textMuted }]}>Blood tests, radiology reports, pathology</Text>
            </View>
            <Switch
              value={shareLabs}
              onValueChange={setShareLabs}
              trackColor={{ false: '#D0D5DD', true: theme.primaryLight }}
              thumbColor={shareLabs ? theme.primary : '#F2F4F7'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.permRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.permTitle, { color: theme.text }]}>Active Prescriptions</Text>
              <Text style={[styles.permDesc, { color: theme.textMuted }]}>Dosages, refill status, allergic warnings</Text>
            </View>
            <Switch
              value={shareMedications}
              onValueChange={setShareMedications}
              trackColor={{ false: '#D0D5DD', true: theme.primaryLight }}
              thumbColor={shareMedications ? theme.primary : '#F2F4F7'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.permRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.permTitle, { color: theme.text }]}>Clinical Visit Notes</Text>
              <Text style={[styles.permDesc, { color: theme.textMuted }]}>Doctor consultations and historical transcripts</Text>
            </View>
            <Switch
              value={shareNotes}
              onValueChange={setShareNotes}
              trackColor={{ false: '#D0D5DD', true: theme.primaryLight }}
              thumbColor={shareNotes ? theme.primary : '#F2F4F7'}
            />
          </View>
        </View>

        {/* Revoke All Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              'Revoke All Access',
              'This will immediately disconnect any clinicians currently viewing your medical records.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Revoke Now',
                  style: 'destructive',
                  onPress: () => {
                    setTimeLeft(0);
                    Alert.alert('Access Revoked', 'All temporary tokens have been revoked.');
                  },
                },
              ]
            );
          }}
          style={[styles.revokeBtn, { borderColor: theme.emergency }]}>
          <AlertTriangle size={18} color={theme.emergency} />
          <Text style={[styles.revokeBtnText, { color: theme.emergency }]}>Revoke All Active Sessions</Text>
        </TouchableOpacity>

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
  shareIconBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  securityBannerTitle: {
    color: '#006022',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  securityBannerDesc: {
    color: '#137333',
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF5E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 12,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  qrBox: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAECF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  qrHelperText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  pinSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  pinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  pinCode: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  regenerateBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  permDesc: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  revokeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
