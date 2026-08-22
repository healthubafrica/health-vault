import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { consents, ConsentType } from '@/lib/api';
import { ListSkeleton, ErrorState } from '@/components/states';

const CONSENT_TYPES: { type: ConsentType; title: string; desc: string }[] = [
  { type: 'treatment', title: 'Treatment Consent', desc: 'Allow healthcare providers to access your records to provide treatment.' },
  { type: 'data_sharing', title: 'Data Sharing', desc: 'Allow your health data to be shared with partner providers and labs for care coordination.' },
  { type: 'telecare', title: 'TeleCare Consent', desc: 'Allow video and audio consultations to be recorded for clinical documentation.' },
  { type: 'research', title: 'Research Participation', desc: 'Allow anonymized health data to be used for medical research.' },
  { type: 'marketing', title: 'Marketing Communications', desc: 'Receive promotional messages about new services and offers.' },
  { type: 'analytics', title: 'Usage Analytics', desc: 'Allow anonymized usage data to help us improve the app.' },
];

export default function ConsentsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['consents'],
    queryFn: () => consents.list(),
  });

  const records = data?.data ?? [];
  const grantedFor = (type: ConsentType) => records.find((r) => r.consentType === type)?.granted ?? false;

  const upsertMutation = useMutation({
    mutationFn: (data: { consentType: ConsentType; granted: boolean }) => consents.upsert(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consents'] }),
  });

  const toggle = (type: ConsentType) => {
    upsertMutation.mutate({ consentType: type, granted: !grantedFor(type) });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Consents & Permissions</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoPill, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '33' }]}>
          <ShieldCheck size={16} color={theme.primary} />
          <Text style={[styles.infoPillText, { color: theme.primaryDark }]}>
            You control what you consent to. Changes take effect immediately and can be revoked anytime.
          </Text>
        </View>

        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : error ? (
          <ErrorState onRetry={refetch} isRetrying={isRefetching} />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {CONSENT_TYPES.map((c, i) => (
              <React.Fragment key={c.type}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: theme.text }]}>{c.title}</Text>
                    <Text style={[styles.rowDesc, { color: theme.textMuted }]}>{c.desc}</Text>
                  </View>
                  <Switch
                    value={grantedFor(c.type)}
                    onValueChange={() => toggle(c.type)}
                    trackColor={{ false: '#D0D5DD', true: theme.primaryLight }}
                    thumbColor={grantedFor(c.type) ? theme.primary : '#F2F4F7'}
                  />
                </View>
              </React.Fragment>
            ))}
          </View>
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
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  infoPillText: { fontSize: 11, fontWeight: '600', flex: 1, lineHeight: 16 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  rowTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  rowDesc: { fontSize: 11, lineHeight: 15 },
  divider: { height: 1, marginVertical: 4 },
});
