import React from 'react';
import { Modal, StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { shares, RecordShare, ApiError } from '@/lib/api';

const ACTION_LABELS: Record<string, string> = {
  otp_requested: 'Verification code requested',
  otp_verified: 'Email verified',
  otp_failed: 'Verification failed',
  viewed: 'Records viewed',
  view: 'Records viewed',
  forwarded_detected: 'Possible forwarding detected',
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
}

export default function ShareActivityModal({ share, onClose }: { share: RecordShare | null; onClose: () => void }) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const { data, isLoading, error } = useQuery({
    queryKey: ['shares', share?.id, 'audit'],
    queryFn: () => shares.audit(share!.id),
    enabled: !!share,
  });
  const accesses = data?.accesses ?? [];
  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <Modal visible={!!share} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text }]}>Share activity</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {isLoading ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
            ) : error ? (
              <Text style={[styles.note, { color: theme.textMuted }]}>
                {notFound ? 'Activity for this share is no longer available.' : 'Could not load activity. Please try again.'}
              </Text>
            ) : accesses.length === 0 ? (
              <Text style={[styles.note, { color: theme.textMuted }]}>No one has opened this share yet.</Text>
            ) : (
              accesses.map((a) => (
                <View key={a.id} style={[styles.row, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.action, { color: theme.text }]}>{actionLabel(a.action)}</Text>
                  <Text style={[styles.meta, { color: theme.textMuted }]}>
                    {a.visitorEmail ? `${a.visitorEmail} · ` : ''}
                    {new Date(a.occurredAt).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  note: { fontSize: 13, paddingVertical: 12 },
  row: { paddingVertical: 10, borderBottomWidth: 1 },
  action: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },
  closeBtn: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
