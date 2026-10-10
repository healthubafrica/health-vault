import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { DocumentCategory } from '@/lib/api';

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  personal_identification: 'ID',
  medical_history: 'Medical History',
  providers: 'Providers',
  specialists: 'Specialists',
  emergency: 'Emergency',
  hospital: 'Hospital',
  laboratory: 'Laboratory',
  imaging: 'Imaging',
  medications: 'Medications',
  vaccinations: 'Vaccinations',
  chronic_disease: 'Chronic Disease',
  womens_health: "Women's Health",
  childrens_health: "Children's Health",
  mental_health: 'Mental Health',
  dental: 'Dental',
  vision: 'Vision',
  travel: 'Travel',
  legal: 'Legal',
  wearables: 'Wearables',
  miscellaneous: 'Other',
};

export interface DocumentFormValues {
  title: string;
  category: DocumentCategory;
  description: string;
  providerVisibility: boolean;
}

/**
 * Title/category (and, when editing, description + provider visibility) form.
 * `mode="upload"` is the prompt shown before a picked file is uploaded.
 */
export default function DocumentEditSheet({
  visible,
  mode,
  initial,
  busy = false,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  mode: 'upload' | 'edit';
  initial: DocumentFormValues;
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (values: DocumentFormValues) => void;
}) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const [values, setValues] = useState(initial);

  useEffect(() => {
    if (visible) setValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const canSave = values.title.trim().length > 0 && !busy;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <Text style={[styles.heading, { color: theme.text }]}>
            {mode === 'upload' ? 'Add to your vault' : 'Edit document'}
          </Text>

          <Text style={[styles.label, { color: theme.textMuted }]}>TITLE</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
            value={values.title}
            maxLength={200}
            onChangeText={(title) => setValues((v) => ({ ...v, title }))}
            placeholder="Document title"
            placeholderTextColor={theme.textFaint}
          />

          <Text style={[styles.label, { color: theme.textMuted }]}>CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {(Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[]).map((cat) => {
              const on = values.category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setValues((v) => ({ ...v, category: cat }))}
                  style={[
                    styles.chip,
                    { backgroundColor: on ? theme.primary : theme.surface, borderColor: on ? theme.primary : theme.border },
                  ]}>
                  <Text style={[styles.chipText, { color: on ? '#FFFFFF' : theme.textMuted }]}>
                    {DOCUMENT_CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {mode === 'edit' && (
            <>
              <Text style={[styles.label, { color: theme.textMuted }]}>DESCRIPTION</Text>
              <TextInput
                style={[
                  styles.input,
                  { height: 72, paddingTop: 10, borderColor: theme.border, backgroundColor: theme.surface, color: theme.text },
                ]}
                multiline
                maxLength={2000}
                value={values.description}
                onChangeText={(description) => setValues((v) => ({ ...v, description }))}
                placeholder="Optional notes"
                placeholderTextColor={theme.textFaint}
              />
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchTitle, { color: theme.text }]}>Visible to my providers</Text>
                  <Text style={[styles.switchSub, { color: theme.textMuted }]}>
                    Clinicians caring for you can see this document.
                  </Text>
                </View>
                <Switch
                  value={values.providerVisibility}
                  onValueChange={(providerVisibility) => setValues((v) => ({ ...v, providerVisibility }))}
                  trackColor={{ false: theme.border, true: theme.primaryLight }}
                  thumbColor={values.providerVisibility ? theme.primary : '#F2F4F7'}
                />
              </View>
            </>
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={[styles.btn, { borderColor: theme.border, borderWidth: 1 }]}>
              <Text style={[styles.btnText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!canSave}
              onPress={() => onSubmit({ ...values, title: values.title.trim() })}
              style={[styles.btn, { backgroundColor: theme.primary, opacity: canSave ? 1 : 0.5 }]}>
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{mode === 'upload' ? 'Upload' : 'Save'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 8 },
  heading: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 4 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  switchTitle: { fontSize: 13, fontWeight: '700' },
  switchSub: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '800', fontSize: 14 },
});
