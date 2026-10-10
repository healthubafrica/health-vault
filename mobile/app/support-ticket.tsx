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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Send } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { support, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import { ticketStatusLabel, ticketStatusPill } from '@/lib/supportTickets';

export default function SupportTicketScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id);
  const [reply, setReply] = useState('');

  const { data: ticket, isLoading, error, refetch } = useQuery({
    queryKey: ['support-ticket', id],
    queryFn: () => support.get(id as string),
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: () => support.addMessage(id as string, reply.trim()),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['support-ticket', id] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (err: unknown) =>
      Alert.alert('Could not send reply', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  // Internal staff notes are never for the patient, whatever the API returns.
  const messages = (ticket?.messages ?? []).filter((m) => !m.isInternal);
  const notFound = error instanceof ApiError && (error.status === 404 || error.status === 403);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{ticket ? `#${ticket.hhaRef}` : 'Ticket'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          {isLoading ? (
            <ListSkeleton rows={3} />
          ) : notFound ? (
            <EmptyState title="Ticket not found" description="This ticket is no longer available." />
          ) : error || !ticket ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <>
              <View style={styles.subjectRow}>
                <Text style={[styles.subject, { color: theme.text }]}>{ticket.subject}</Text>
                <StatusPill status={ticketStatusPill(ticket.status)} label={ticketStatusLabel(ticket.status)} />
              </View>
              {messages.length === 0 ? (
                <Text style={[styles.meta, { color: theme.textMuted }]}>No messages yet.</Text>
              ) : (
                messages.map((m) => {
                  const mine = !!myId && m.senderId === myId;
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.bubble,
                        mine
                          ? { alignSelf: 'flex-end', backgroundColor: theme.primaryLight }
                          : { alignSelf: 'flex-start', backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
                      ]}>
                      <Text style={[styles.sender, { color: theme.textMuted }]}>{mine ? 'You' : 'Support'}</Text>
                      <Text style={[styles.body, { color: theme.text }]}>{m.body}</Text>
                      <Text style={[styles.meta, { color: theme.textMuted }]}>{new Date(m.createdAt).toLocaleString()}</Text>
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>

        {ticket && (
          <View style={[styles.replyBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.replyInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="Write a reply…"
              placeholderTextColor={theme.textMuted}
              multiline
              value={reply}
              onChangeText={setReply}
            />
            <TouchableOpacity
              accessibilityLabel="Send reply"
              disabled={!reply.trim() || sendMutation.isPending}
              onPress={() => sendMutation.mutate()}
              style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: reply.trim() ? 1 : 0.5 }]}>
              {sendMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
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
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  subject: { flex: 1, fontSize: 16, fontWeight: '800' },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14, gap: 4 },
  sender: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 11 },
  replyBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1 },
  replyInput: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingTop: 10, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
