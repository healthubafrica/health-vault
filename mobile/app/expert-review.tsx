import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Stethoscope, FileCheck2 } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { expertReview } from '@/lib/api';
import {
  caseTitle,
  reviewTypeLabel,
  statusLabel,
  statusPill,
  urgencyLabel,
  urgencyPill,
  URGENCY_NOTE,
} from '@/lib/expertReview';

export default function ExpertReviewScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['expert-review', 'cases'],
    queryFn: () => expertReview.list(),
  });
  const cases = data ?? [];

  const bookReview = () =>
    router.push({ pathname: '/book-appointment-step1', params: { preselect: 'expert-review' } } as never);
  const submitCase = () => router.push('/expert-review-new' as never);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Expert Review</Text>
        <TouchableOpacity
          accessibilityLabel="Submit a case"
          activeOpacity={0.7}
          onPress={submitCase}
          style={styles.backBtn}>
          <Plus size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.meta, { color: theme.textMuted }]}>Track your specialist second-opinion cases</Text>

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : cases.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No Expert Review Cases"
            description="Request a specialist second opinion on your medical diagnosis and treatment plan."
            primaryActionLabel="Book Expert Review"
            onPrimaryAction={bookReview}
            secondaryActionLabel="Submit a case"
            onSecondaryAction={submitCase}
          />
        ) : (
          <>
            {cases.map((c) => (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/expert-review-case', params: { id: c.id } } as never)}
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                    {caseTitle(c)}
                  </Text>
                  <View style={styles.pills}>
                    <StatusPill status={statusPill(c.status)} label={statusLabel(c.status)} />
                    <StatusPill status={urgencyPill(c.urgency)} label={urgencyLabel(c.urgency)} />
                  </View>
                  <Text style={[styles.meta, { color: theme.textMuted }]}>
                    {c.hhaRef} · {reviewTypeLabel(c.reviewType)} · Submitted {new Date(c.submittedAt).toLocaleDateString()}
                  </Text>
                  {c.primaryDiagnosis ? (
                    <Text style={[styles.meta, { color: theme.textFaint }]} numberOfLines={2}>
                      {c.clinicalQuestion}
                    </Text>
                  ) : null}
                  {c.finalReport ? (
                    <View style={styles.reportRow}>
                      <FileCheck2 size={13} color={theme.status.success.text} />
                      <Text style={[styles.reportText, { color: theme.status.success.text }]}>Report ready</Text>
                    </View>
                  ) : null}
                </View>
                <ChevronRight size={16} color={theme.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity activeOpacity={0.85} onPress={submitCase} style={[styles.cta, { backgroundColor: theme.primary }]}>
              <Text style={styles.ctaText}>Submit a case</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={[styles.note, { color: theme.textMuted }]}>{URGENCY_NOTE}</Text>
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
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meta: { fontSize: 12 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportText: { fontSize: 12, fontWeight: '700' },
  cta: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  note: { fontSize: 11, lineHeight: 16, marginTop: 8 },
});
