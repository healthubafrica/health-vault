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
import { ChevronLeft, ChevronRight, Siren } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { dispatch } from '@/lib/api';
import { dispatchStatusLabel, dispatchStatusPill, emergencyTypeLabel } from '@/lib/dispatch';

export default function DispatchHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dispatch', 'cases'],
    queryFn: () => dispatch.list(),
  });
  const cases = data?.data ?? [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Dispatch History</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : cases.length === 0 ? (
          <EmptyState
            icon={Siren}
            title="No dispatch requests"
            description="Emergency requests you send through DispatchCare will be listed here."
          />
        ) : (
          cases.map((c) => (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/dispatch-case', params: { id: c.id } } as never)}
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{emergencyTypeLabel(c.emergencyType)}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  #{c.hhaRef} · {new Date(c.createdAt).toLocaleString()}
                </Text>
              </View>
              <StatusPill status={dispatchStatusPill(c.status)} label={dispatchStatusLabel(c.status)} />
              <ChevronRight size={16} color={theme.textMuted} />
            </TouchableOpacity>
          ))
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
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  meta: { fontSize: 11 },
});
