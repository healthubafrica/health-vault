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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { dispatch, ApiError } from '@/lib/api';
import { dispatchStatusLabel, dispatchStatusPill, emergencyTypeLabel } from '@/lib/dispatch';

export default function DispatchCaseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dispatch', 'case', id],
    queryFn: () => dispatch.get(id as string),
    enabled: !!id,
  });
  const c = data?.data;
  const notFound = error instanceof ApiError && (error.status === 404 || error.status === 403);
  // Backend returns events oldest-first for a single case; sort anyway so the timeline is always chronological.
  const events = [...(c?.events ?? [])].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{c ? `#${c.hhaRef}` : 'Dispatch Request'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : notFound ? (
          <EmptyState title="Request not found" description="This dispatch request is no longer available." />
        ) : error || !c ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.row}>
                <Text style={[styles.heading, { color: theme.text }]}>{emergencyTypeLabel(c.emergencyType)}</Text>
                <StatusPill status={dispatchStatusPill(c.status)} label={dispatchStatusLabel(c.status)} />
              </View>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                Sent {new Date(c.createdAt).toLocaleString()}
              </Text>
              {c.etaMinutes != null && c.status !== 'closed' && (
                <Text style={[styles.meta, { color: theme.text }]}>Estimated arrival: {c.etaMinutes} min</Text>
              )}
              {c.locationText ? <Text style={[styles.meta, { color: theme.textMuted }]}>{c.locationText}</Text> : null}
              {c.description ? <Text style={[styles.body, { color: theme.text }]}>{c.description}</Text> : null}
            </View>

            <Text style={[styles.section, { color: theme.textMuted }]}>TIMELINE</Text>
            {events.length === 0 ? (
              <Text style={[styles.meta, { color: theme.textMuted }]}>No status updates yet.</Text>
            ) : (
              events.map((e) => (
                <View key={e.id} style={[styles.event, { borderLeftColor: theme.primary }]}>
                  <Text style={[styles.eventTitle, { color: theme.text }]}>{dispatchStatusLabel(e.status)}</Text>
                  <Text style={[styles.meta, { color: theme.textMuted }]}>{new Date(e.occurredAt).toLocaleString()}</Text>
                  {e.notes ? <Text style={[styles.body, { color: theme.text }]}>{e.notes}</Text> : null}
                </View>
              ))
            )}
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
  title: { fontSize: 18, fontWeight: '800' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heading: { fontSize: 16, fontWeight: '800', flex: 1 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 4 },
  event: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, gap: 2 },
  eventTitle: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12 },
  body: { fontSize: 13, lineHeight: 18 },
});
