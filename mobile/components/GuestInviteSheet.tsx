import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { telecareGuestInvites, GuestInvite, ApiError } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

/** Lets the patient who owns a telecare session invite (and revoke) a family/caregiver guest. */
export default function GuestInviteSheet({
  sessionId,
  visible,
  onClose,
}: {
  sessionId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const key = ['telecare', 'guest-invites', sessionId];

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => telecareGuestInvites.list(sessionId),
    enabled: visible,
  });
  const invites = (data ?? []).filter((i: GuestInvite) => !i.isRevoked);
  const unavailable = error instanceof ApiError && error.status === 404;

  const createMutation = useMutation({
    mutationFn: () => telecareGuestInvites.create(sessionId, { guestName: name.trim(), guestEmail: email.trim() }),
    onSuccess: () => {
      setName('');
      setEmail('');
      qc.invalidateQueries({ queryKey: key });
      Alert.alert('Invite sent', 'Your guest was emailed a link. They verify their email with a code before joining.');
    },
    onError: (err: unknown) => Alert.alert('Could not send invite', errMessage(err, 'Please try again.')),
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => telecareGuestInvites.revoke(sessionId, inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (err: unknown) => Alert.alert('Could not revoke invite', errMessage(err, 'Please try again.')),
  });

  const submit = () => {
    if (name.trim().length < 2) {
      Alert.alert('Guest name', 'Please enter the guest\'s name (at least 2 characters).');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    createMutation.mutate();
  };

  const inputStyle = [styles.input, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text }]}>Invite a guest</Text>
          <Text style={[styles.sub, { color: theme.textMuted }]}>
            A family member or caregiver can join this call from their own device.
          </Text>

          <TextInput
            style={inputStyle}
            placeholder="Guest name"
            placeholderTextColor={theme.textFaint}
            maxLength={100}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={inputStyle}
            placeholder="Guest email"
            placeholderTextColor={theme.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={createMutation.isPending}
            onPress={submit}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            {createMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>Send invite</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.section, { color: theme.textMuted }]}>INVITED GUESTS</Text>
          <ScrollView style={{ maxHeight: 180 }}>
            {isLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : error ? (
              <Text style={[styles.sub, { color: theme.textMuted }]}>
                {unavailable
                  ? 'Guest invites are not available for this session.'
                  : 'Could not load invites. Please try again.'}
              </Text>
            ) : invites.length === 0 ? (
              <Text style={[styles.sub, { color: theme.textMuted }]}>No active invites.</Text>
            ) : (
              invites.map((inv) => (
                <View key={inv.id} style={[styles.inviteRow, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inviteName, { color: theme.text }]}>{inv.guestName}</Text>
                    <Text style={[styles.sub, { color: theme.textMuted }]}>
                      {inv.guestEmail}
                      {inv.verifiedAt ? ' · verified' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity disabled={revokeMutation.isPending} onPress={() => revokeMutation.mutate(inv.id)}>
                    <Text style={[styles.revoke, { color: theme.status.error.solid }]}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: theme.border }]}>
            <Text style={[styles.closeText, { color: theme.text }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 10 },
  title: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 12 },
  input: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
  primaryBtn: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 6 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  inviteName: { fontSize: 14, fontWeight: '700' },
  revoke: { fontSize: 12, fontWeight: '800' },
  closeBtn: { height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  closeText: { fontWeight: '700', fontSize: 14 },
});
