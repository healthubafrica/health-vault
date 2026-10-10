import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { expertReview, ApiError } from '@/lib/api';
import {
  caseTitle,
  documentName,
  DISCLAIMER_TEXT,
  noteText,
  reviewTypeLabel,
  sortEvents,
  statusLabel,
  statusPill,
  urgencyLabel,
  urgencyPill,
  URGENCY_NOTE,
} from '@/lib/expertReview';

export default function ExpertReviewCaseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const { data: c, isLoading, error, refetch } = useQuery({
    queryKey: ['expert-review', 'case', id],
    queryFn: () => expertReview.get(id as string),
    enabled: !!id,
  });
  const notFound = error instanceof ApiError && (error.status === 404 || error.status === 403);

  const acknowledge = useMutation({
    mutationFn: () => expertReview.acknowledgeDisclaimer(id as string),
    onSuccess: async () => {
      await refetch();
      qc.invalidateQueries({ queryKey: ['expert-review', 'cases'] });
    },
    onError: (err: unknown) =>
      Alert.alert('Could not acknowledge', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const events = sortEvents(c?.statusEvents);
  const notes = (c?.specialistNotes ?? []).filter((n) => noteText(n));
  const documents = c?.documents ?? [];
  const report = c?.finalReport;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{c ? c.hhaRef : 'Expert Review'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : notFound ? (
          <EmptyState title="Case not found" description="This Expert Review case is no longer available." />
        ) : error || !c ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.heading, { color: theme.text }]}>{caseTitle(c)}</Text>
              <View style={styles.pills}>
                <StatusPill status={statusPill(c.status)} label={statusLabel(c.status)} />
                <StatusPill status={urgencyPill(c.urgency)} label={urgencyLabel(c.urgency)} />
              </View>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {reviewTypeLabel(c.reviewType)} · Submitted {new Date(c.submittedAt).toLocaleDateString()}
              </Text>
              {c.primaryDiagnosis ? <Text style={[styles.body, { color: theme.text }]}>{c.clinicalQuestion}</Text> : null}
              <Text style={[styles.meta, { color: theme.textMuted }]}>{URGENCY_NOTE}</Text>
            </View>

            <Text style={[styles.section, { color: theme.textMuted }]}>TIMELINE</Text>
            {events.length === 0 ? (
              <Text style={[styles.meta, { color: theme.textMuted }]}>No status updates yet.</Text>
            ) : (
              events.map((e, i) => (
                <View key={e.id ?? i} style={[styles.event, { borderLeftColor: theme.primary }]}>
                  <Text style={[styles.eventTitle, { color: theme.text }]}>{statusLabel(e.toStatus)}</Text>
                  <Text style={[styles.meta, { color: theme.textMuted }]}>{new Date(e.occurredAt).toLocaleString()}</Text>
                  {e.notes ? <Text style={[styles.body, { color: theme.text }]}>{e.notes}</Text> : null}
                </View>
              ))
            )}

            {notes.length > 0 && (
              <>
                <Text style={[styles.section, { color: theme.textMuted }]}>NOTES FROM YOUR SPECIALIST</Text>
                {notes.map((n, i) => (
                  <View key={n.id ?? i} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.body, { color: theme.text }]}>{noteText(n)}</Text>
                    {n.createdAt ? (
                      <Text style={[styles.meta, { color: theme.textMuted }]}>{new Date(n.createdAt).toLocaleString()}</Text>
                    ) : null}
                  </View>
                ))}
              </>
            )}

            {documents.length > 0 && (
              <>
                <Text style={[styles.section, { color: theme.textMuted }]}>DOCUMENTS</Text>
                {documents.map((d, i) => (
                  <Text key={d.id ?? i} style={[styles.body, { color: theme.text }]}>
                    • {documentName(d)}
                  </Text>
                ))}
              </>
            )}

            <Text style={[styles.section, { color: theme.textMuted }]}>FINAL REPORT</Text>
            {c.reportRequiresDisclaimer ? (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.eventTitle, { color: theme.text }]}>Your report is ready</Text>
                <Text style={[styles.body, { color: theme.text }]}>{DISCLAIMER_TEXT}</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={acknowledge.isPending}
                  onPress={() => acknowledge.mutate()}
                  style={[styles.cta, { backgroundColor: theme.primary, opacity: acknowledge.isPending ? 0.7 : 1 }]}>
                  {acknowledge.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.ctaText}>Acknowledge</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : report ? (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {report.summary ? <ReportBlock label="Summary" text={report.summary} theme={theme} /> : null}
                {report.clinicalOpinion ? (
                  <ReportBlock label="Clinical opinion" text={report.clinicalOpinion} theme={theme} />
                ) : null}
                {report.recommendations ? (
                  <ReportBlock label="Recommendations" text={report.recommendations} theme={theme} />
                ) : null}
                {report.followUpRequired ? (
                  <Text style={[styles.eventTitle, { color: theme.text }]}>Follow-up is recommended.</Text>
                ) : null}
                {report.pdfUrl ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => Linking.openURL(report.pdfUrl as string).catch(() => {})}
                    style={[styles.cta, { backgroundColor: theme.primary }]}>
                    <Text style={styles.ctaText}>Open report PDF</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                No report yet. You will see it here when your specialist completes the review.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportBlock({ label, text, theme }: { label: string; text: string; theme: (typeof Colors)['light'] }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[styles.meta, { color: theme.textMuted, fontWeight: '700' }]}>{label}</Text>
      <Text style={[styles.body, { color: theme.text }]}>{text}</Text>
    </View>
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
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  heading: { fontSize: 16, fontWeight: '800' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 4 },
  event: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, gap: 2 },
  eventTitle: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12 },
  body: { fontSize: 13, lineHeight: 18 },
  cta: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
