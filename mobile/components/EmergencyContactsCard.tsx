import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { ApiError, emergencyContacts, EmergencyContact } from '@/lib/api';

const MAX_CONTACTS = 5;
const EMPTY = { fullName: '', relationship: '', phone: '', email: '' };

// Lists the patient's emergency contacts with add / edit / remove, backed by
// /patients/me/emergency-contacts. Shown in My Profile.
export default function EmergencyContactsCard() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EmergencyContact | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['emergency-contacts'],
    queryFn: () => emergencyContacts.list(),
  });
  const contacts = data ?? [];

  const onError = (err: unknown) =>
    Alert.alert('Could not save', err instanceof ApiError ? err.message : 'Please try again.');
  const done = () => {
    setEditing(null);
    qc.invalidateQueries({ queryKey: ['emergency-contacts'] });
    qc.invalidateQueries({ queryKey: ['patient', 'profile'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        fullName: form.fullName.trim(),
        relationship: form.relationship.trim(),
        phone: form.phone.trim(),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
      };
      return editing && editing !== 'new' ? emergencyContacts.update(editing.id, body) : emergencyContacts.create(body);
    },
    onSuccess: done,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => emergencyContacts.remove(id),
    onSuccess: done,
    onError,
  });
  const makePrimary = useMutation({
    mutationFn: (id: string) => emergencyContacts.update(id, { isPrimary: true }),
    onSuccess: done,
    onError,
  });

  const open = (c: EmergencyContact | 'new') => {
    setForm(c === 'new' ? EMPTY : { fullName: c.fullName, relationship: c.relationship, phone: c.phone, email: c.email ?? '' });
    setEditing(c);
  };

  const canSave = form.fullName.trim() && form.relationship.trim() && form.phone.trim().length >= 6;

  const confirmRemove = (c: EmergencyContact) =>
    Alert.alert('Remove contact', `Remove ${c.fullName} from your emergency contacts?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(c.id) },
    ]);

  return (
    <View>
      {isLoading ? (
        <Text style={{ color: theme.textMuted }}>Loading…</Text>
      ) : isError ? (
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Could not load contacts. Tap to retry.</Text>
        </TouchableOpacity>
      ) : contacts.length === 0 ? (
        <Text style={{ color: theme.textMuted }}>No emergency contact saved yet.</Text>
      ) : (
        contacts.map((c) => (
          <View key={c.id} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.text }]}>
                {c.fullName}
                {c.isPrimary ? '  ·  Primary' : ''}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                {c.relationship} · {c.phone}
              </Text>
            </View>
            {!c.isPrimary && (
              <TouchableOpacity onPress={() => makePrimary.mutate(c.id)}>
                <Text style={[styles.link, { color: theme.primary }]}>Make primary</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => open(c)}>
              <Text style={[styles.link, { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmRemove(c)}>
              <Text style={[styles.link, { color: theme.emergency }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {contacts.length < MAX_CONTACTS && !isError && (
        <TouchableOpacity onPress={() => open('new')} style={[styles.addBtn, { borderColor: theme.primary }]}>
          <Text style={{ color: theme.primary, fontWeight: '800' }}>+ Add emergency contact</Text>
        </TouchableOpacity>
      )}

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <Text style={[styles.name, { color: theme.text }]}>
              {editing === 'new' ? 'Add emergency contact' : 'Edit emergency contact'}
            </Text>
            {(
              [
                ['fullName', 'Full name', 'default'],
                ['relationship', 'Relationship (e.g. Sister)', 'default'],
                ['phone', 'Phone number', 'phone-pad'],
                ['email', 'Email (optional)', 'email-address'],
              ] as const
            ).map(([key, label, keyboard]) => (
              <TextInput
                key={key}
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                placeholder={label}
                placeholderTextColor={theme.textMuted}
                keyboardType={keyboard}
                autoCapitalize={key === 'email' ? 'none' : 'words'}
                value={form[key]}
                onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
              />
            ))}
            <TouchableOpacity
              disabled={!canSave || save.isPending}
              onPress={() => save.mutate()}
              style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: !canSave || save.isPending ? 0.5 : 1 }]}>
              <Text style={styles.saveText}>{save.isPending ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(null)} style={{ alignItems: 'center', padding: 8 }}>
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '800' },
  link: { fontSize: 12, fontWeight: '800' },
  addBtn: { marginTop: 4, padding: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', borderStyle: 'dashed' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 16, padding: 18, gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '800' },
});
