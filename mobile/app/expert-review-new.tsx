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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { SuccessState } from '@/components/states';
import { expertReview, ApiError } from '@/lib/api';
import {
  buildPayload,
  FormValues,
  REVIEW_TYPES,
  reviewTypeLabel,
  URGENCIES,
  urgencyLabel,
  URGENCY_NOTE,
  validateForm,
} from '@/lib/expertReview';

const EMPTY: FormValues = {
  reviewType: null,
  urgency: null,
  clinicalSummary: '',
  specificQuestions: '',
  requestedSpecialization: '',
};

export default function ExpertReviewNewScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const [values, setValues] = useState<FormValues>(EMPTY);
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateForm(values);
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = useMutation({
    mutationFn: () => expertReview.create(buildPayload(values)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expert-review', 'cases'] }),
    onError: (err: unknown) =>
      Alert.alert('Could not submit your case', err instanceof ApiError ? err.message : 'Please try again.'),
  });

  const onSubmit = () => {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    submit.mutate();
  };

  const input = [styles.input, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }];

  const chips = <T extends string>(options: readonly T[], selected: T | null, label: (o: T) => string, onPick: (o: T) => void) => (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = selected === o;
        return (
          <TouchableOpacity
            key={o}
            activeOpacity={0.8}
            onPress={() => onPick(o)}
            style={[styles.chip, { backgroundColor: on ? theme.primary : theme.surface, borderColor: on ? theme.primary : theme.border }]}>
            <Text style={[styles.chipText, { color: on ? '#FFFFFF' : theme.text }]}>{label(o)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const errorText = (msg?: string) =>
    showErrors && msg ? <Text style={[styles.error, { color: theme.status.error.text }]}>{msg}</Text> : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Submit a Case</Text>
        <View style={{ width: 24 }} />
      </View>

      {submit.isSuccess ? (
        <ScrollView contentContainerStyle={styles.content}>
          <SuccessState
            title="Case submitted"
            message="Your Expert Review case has been received. You can follow its progress in your case list."
            referenceId={submit.data?.hhaRef}
            primaryActionLabel="View my cases"
            onPrimaryAction={() => router.replace('/expert-review' as never)}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: theme.text }]}>Review type</Text>
          {chips(REVIEW_TYPES, values.reviewType, reviewTypeLabel, (o) => set('reviewType', o))}
          {errorText(errors.reviewType)}

          <Text style={[styles.label, { color: theme.text }]}>Urgency</Text>
          {chips(URGENCIES, values.urgency, urgencyLabel, (o) => set('urgency', o))}
          <Text style={[styles.hint, { color: theme.textMuted }]}>{URGENCY_NOTE}</Text>
          {errorText(errors.urgency)}

          <Text style={[styles.label, { color: theme.text }]}>Clinical summary</Text>
          <TextInput
            style={[...input, styles.multiline]}
            placeholder="Describe your condition, diagnosis and treatment so far"
            placeholderTextColor={theme.textFaint}
            multiline
            value={values.clinicalSummary}
            onChangeText={(t) => set('clinicalSummary', t)}
          />
          {errorText(errors.clinicalSummary)}

          <Text style={[styles.label, { color: theme.text }]}>Specific questions (optional)</Text>
          <TextInput
            style={[...input, styles.multiline]}
            placeholder="What do you want the specialist to answer?"
            placeholderTextColor={theme.textFaint}
            multiline
            value={values.specificQuestions}
            onChangeText={(t) => set('specificQuestions', t)}
          />

          <Text style={[styles.label, { color: theme.text }]}>Requested specialization (optional)</Text>
          <TextInput
            style={input}
            placeholder="e.g. Cardiology"
            placeholderTextColor={theme.textFaint}
            value={values.requestedSpecialization}
            onChangeText={(t) => set('requestedSpecialization', t)}
          />

          <Text style={[styles.hint, { color: theme.textMuted }]}>
            By submitting you confirm this is not an emergency. Expert Review is not an emergency service.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={submit.isPending}
            onPress={onSubmit}
            style={[styles.cta, { backgroundColor: theme.primary, opacity: submit.isPending ? 0.7 : 1 }]}>
            {submit.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Submit case</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
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
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  hint: { fontSize: 11, lineHeight: 16 },
  error: { fontSize: 12, fontWeight: '600' },
  cta: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
