import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Mail,
  X,
  ShieldCheck,
  Trash2,
  Clock,
} from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { shares, RecordShare, ApiError } from '@/lib/api';
import { EmptyState, SuccessState } from '@/components/states';

// Must match CreateShareDto's @IsIn list on the backend exactly.
const RECORD_TYPE_OPTIONS = [
  { id: 'visit', label: 'Visits' },
  { id: 'lab', label: 'Labs' },
  { id: 'prescription', label: 'Prescriptions' },
  { id: 'referral', label: 'Referrals' },
  { id: 'imaging', label: 'Imaging' },
  { id: 'document', label: 'Documents' },
  { id: 'expert_review', label: 'Expert Reviews' },
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ShareRecordsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [detectForwarding, setDetectForwarding] = useState(true);
  const [justCreated, setJustCreated] = useState<{ emails: number } | null>(null);

  const { data: activeShares, isLoading } = useQuery({
    queryKey: ['shares'],
    queryFn: () => shares.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      shares.create({
        accessMode: 'email_list',
        allowedEmails: emails,
        recordTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
        detectForwarding,
        notifyRecipients: true,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['shares'] });
      setJustCreated({ emails: res.notified.emails });
      setEmails([]);
      setEmailInput('');
      setSelectedTypes([]);
    },
    onError: (err: unknown) => {
      Alert.alert('Could not create share', err instanceof ApiError ? err.message : 'Please try again.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => shares.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shares'] }),
    onError: (err: unknown) => {
      Alert.alert('Could not revoke share', err instanceof ApiError ? err.message : 'Please try again.');
    },
  });

  const addEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (emails.includes(trimmed)) {
      setEmailInput('');
      return;
    }
    setEmails([...emails, trimmed]);
    setEmailInput('');
  };

  const toggleType = (id: string) => {
    setSelectedTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleRevoke = (share: RecordShare) => {
    Alert.alert('Revoke Share', 'Recipients will immediately lose access to these records. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revokeMutation.mutate(share.id) },
    ]);
  };

  if (justCreated) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.header}>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { justifyContent: 'center', flexGrow: 1 }]}>
          <SuccessState
            title="Share Sent"
            message={`A secure link and one-time verification code was emailed to ${justCreated.emails} recipient${justCreated.emails === 1 ? '' : 's'}. They'll verify their email before viewing anything.`}
            primaryActionLabel="Done"
            onPrimaryAction={() => { setJustCreated(null); router.back(); }}
            secondaryActionLabel="Share Again"
            onSecondaryAction={() => setJustCreated(null)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Share My Records</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={[styles.securityPill, { backgroundColor: '#EAF5E2', borderColor: '#B7E0A5' }]}>
          <ShieldCheck size={16} color="#006022" />
          <Text style={styles.securityPillText}>
            Recipients verify their email with a one-time code before they can view anything.
          </Text>
        </View>

        {/* Recipient emails */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Share with</Text>
          <View style={[styles.emailInputRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Mail size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.emailInput, { color: theme.text }]}
              placeholder="Enter recipient's email address"
              placeholderTextColor={theme.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailInput}
              onChangeText={setEmailInput}
              onSubmitEditing={addEmail}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={addEmail} style={[styles.addBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
          {emails.length > 0 && (
            <View style={styles.emailChipsRow}>
              {emails.map((email) => (
                <View key={email} style={[styles.emailChip, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.emailChipText, { color: theme.text }]}>{email}</Text>
                  <TouchableOpacity onPress={() => setEmails(emails.filter((e) => e !== email))}>
                    <X size={13} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Record types */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What to share</Text>
          <Text style={[styles.sectionSub, { color: theme.textMuted }]}>Leave all unselected to share your full record.</Text>
          <View style={styles.typesGrid}>
            {RECORD_TYPE_OPTIONS.map((opt) => {
              const isSelected = selectedTypes.includes(opt.id);
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.8}
                  onPress={() => toggleType(opt.id)}
                  style={[
                    styles.typeChip,
                    { backgroundColor: isSelected ? theme.primary : theme.surface, borderColor: isSelected ? theme.primary : theme.border },
                  ]}>
                  <Text style={[styles.typeChipText, { color: isSelected ? '#FFFFFF' : theme.text }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Forwarding detection */}
        <View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: theme.text }]}>Detect Forwarding</Text>
            <Text style={[styles.toggleSub, { color: theme.textMuted }]}>Alert if this link is opened from an unexpected email</Text>
          </View>
          <Switch
            value={detectForwarding}
            onValueChange={setDetectForwarding}
            trackColor={{ false: theme.border, true: theme.primaryLight }}
            thumbColor={detectForwarding ? theme.primary : '#F2F4F7'}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={emails.length === 0 || createMutation.isPending}
          onPress={() => createMutation.mutate()}
          style={[styles.submitBtn, { backgroundColor: emails.length === 0 ? theme.muted : theme.primary }]}>
          {createMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.submitBtnText, { color: emails.length === 0 ? theme.textMuted : '#FFFFFF' }]}>Send Secure Share</Text>
          )}
        </TouchableOpacity>

        {/* Active shares */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Active Shares</Text>
          {isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />
          ) : (activeShares ?? []).filter((s) => !s.isRevoked).length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No active shares"
              description="Records you share will appear here so you can review or revoke access anytime."
            />
          ) : (
            <View style={{ gap: 10 }}>
              {(activeShares ?? []).filter((s) => !s.isRevoked).map((share) => (
                <View key={share.id} style={[styles.shareCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.shareEmails, { color: theme.text }]} numberOfLines={1}>
                      {share.allowedEmails.join(', ')}
                    </Text>
                    <View style={styles.shareMetaRow}>
                      <Clock size={11} color={theme.textFaint} />
                      <Text style={[styles.shareMeta, { color: theme.textFaint }]}>
                        {share._count.accesses} view{share._count.accesses === 1 ? '' : 's'} · {new Date(share.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    disabled={revokeMutation.isPending}
                    onPress={() => handleRevoke(share)}
                    style={styles.revokeBtn}>
                    <Trash2 size={16} color={theme.status.error.solid} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6 },
  title: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 20 },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  securityPillText: { color: '#006022', fontSize: 11, fontWeight: '700', flex: 1 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionSub: { fontSize: 11, marginTop: -6 },
  emailInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  emailInput: { flex: 1, fontSize: 14 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  emailChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  emailChipText: { fontSize: 11, fontWeight: '600' },
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typeChipText: { fontSize: 12, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  toggleTitle: { fontSize: 13, fontWeight: '700' },
  toggleSub: { fontSize: 11, marginTop: 2 },
  submitBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '800' },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  shareEmails: { fontSize: 13, fontWeight: '700' },
  shareMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  shareMeta: { fontSize: 11 },
  revokeBtn: { padding: 8 },
});
