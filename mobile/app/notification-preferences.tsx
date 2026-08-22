import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Mail, MessageSquare, Bell, Smartphone } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { notificationPrefs, NotificationPrefs } from '@/lib/api';
import { ListSkeleton, ErrorState } from '@/components/states';

const CHANNELS: { key: keyof NotificationPrefs; title: string; desc: string; icon: typeof Mail }[] = [
  { key: 'emailEnabled', title: 'Email', desc: 'Receive updates by email', icon: Mail },
  { key: 'smsEnabled', title: 'SMS', desc: 'Receive updates by text message', icon: MessageSquare },
  { key: 'pushEnabled', title: 'Push Notifications', desc: 'Receive alerts on this device', icon: Bell },
  { key: 'whatsappEnabled', title: 'WhatsApp', desc: 'Receive updates on WhatsApp', icon: Smartphone },
];

const ALERT_TYPES: { key: keyof NotificationPrefs; title: string; desc: string }[] = [
  { key: 'appointmentReminders', title: 'Appointment Reminders', desc: 'Upcoming visits and TeleCare sessions' },
  { key: 'labResultAlerts', title: 'Lab Result Alerts', desc: 'New results ready to view' },
  { key: 'paymentReceipts', title: 'Payment Receipts', desc: 'Confirmations after each payment' },
  { key: 'dispatchUpdates', title: 'Emergency Dispatch Updates', desc: 'Status of an active SOS dispatch' },
  { key: 'expertReviewUpdates', title: 'Expert Review Updates', desc: 'Progress on a second-opinion case' },
  { key: 'marketingComms', title: 'News & Offers', desc: 'Product updates and promotions' },
];

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () => notificationPrefs.get(),
  });

  const prefs = data?.data;

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<NotificationPrefs>) => notificationPrefs.update(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ['notification-prefs'] });
      const previous = qc.getQueryData<{ data: NotificationPrefs }>(['notification-prefs']);
      if (previous) {
        qc.setQueryData(['notification-prefs'], { data: { ...previous.data, ...patch } });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) qc.setQueryData(['notification-prefs'], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notification-prefs'] }),
  });

  const toggle = (key: keyof NotificationPrefs) => {
    if (!prefs) return;
    updateMutation.mutate({ [key]: !prefs[key] });
  };

  const renderRow = (key: keyof NotificationPrefs, title: string, desc: string, Icon?: typeof Mail) => (
    <View key={key} style={styles.row}>
      {Icon && <Icon size={20} color={theme.primary} />}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.rowDesc, { color: theme.textMuted }]}>{desc}</Text>
      </View>
      <Switch
        value={prefs ? prefs[key] : false}
        onValueChange={() => toggle(key)}
        trackColor={{ false: '#D0D5DD', true: theme.primaryLight }}
        thumbColor={prefs?.[key] ? theme.primary : '#F2F4F7'}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Notification Preferences</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <>
            <ListSkeleton rows={4} />
            <ListSkeleton rows={6} />
          </>
        ) : error && !prefs ? (
          <ErrorState onRetry={refetch} isRetrying={isRefetching} />
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Channels</Text>
            </View>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {CHANNELS.map((c, i) => (
                <React.Fragment key={c.key}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                  {renderRow(c.key, c.title, c.desc, c.icon)}
                </React.Fragment>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Alert Types</Text>
            </View>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {ALERT_TYPES.map((a, i) => (
                <React.Fragment key={a.key}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                  {renderRow(a.key, a.title, a.desc)}
                </React.Fragment>
              ))}
            </View>
          </>
        )}
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
  title: { fontSize: 17, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  sectionHeader: { marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  rowTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  rowDesc: { fontSize: 11 },
  divider: { height: 1, marginVertical: 4 },
});
