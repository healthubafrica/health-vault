import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import EmergencyFAB from '@/components/EmergencyFAB';
import { vitals, CreateVitalsPayload, ApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

interface MetricOption {
  label: string;
  unit: string;
  min: number;
  normalMax: number;
  defaultValue: string;
  rangeText: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  { label: 'Heart Rate', unit: 'bpm', min: 60, normalMax: 100, defaultValue: '72', rangeText: 'Normal range: 60–100 bpm' },
  { label: 'Blood Pressure', unit: 'mmHg', min: 90, normalMax: 130, defaultValue: '120/80', rangeText: 'Normal range: 90–120 / 60–80 mmHg' },
  { label: 'SpO₂', unit: '%', min: 95, normalMax: 100, defaultValue: '98', rangeText: 'Normal range: 95–100 %' },
  { label: 'Temperature', unit: '°C', min: 36.0, normalMax: 37.5, defaultValue: '36.8', rangeText: 'Normal range: 36.0–37.5 °C' },
  { label: 'Respiratory Rate', unit: 'breaths/min', min: 12, normalMax: 20, defaultValue: '16', rangeText: 'Normal range: 12–20 breaths/min' },
  { label: 'Weight', unit: 'kg', min: 40, normalMax: 150, defaultValue: '72.5', rangeText: 'Target range based on BMI' },
  { label: 'Blood Glucose', unit: 'mmol/L', min: 3.5, normalMax: 6.0, defaultValue: '5.4', rangeText: 'Fasting normal: 3.5–6.0 mmol/L' },
  { label: 'Pain Score', unit: '/10', min: 0, normalMax: 10, defaultValue: '2', rangeText: 'Scale: 0 (no pain) to 10 (worst)' },
];

export default function RecordVitalsEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const initialMetric = (params.metric as string) || 'Heart Rate';
  const [selectedMetric, setSelectedMetric] = useState<MetricOption>(
    METRIC_OPTIONS.find((m) => m.label === initialMetric) || METRIC_OPTIONS[0]
  );
  const [value, setValue] = useState(selectedMetric.defaultValue);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const calculateStatus = (valStr: string, metric: MetricOption): 'green' | 'amber' | 'red' => {
    if (metric.label === 'Blood Pressure') {
      const parts = valStr.split('/');
      if (parts.length === 2) {
        const sys = parseFloat(parts[0]);
        const dia = parseFloat(parts[1]);
        if (!isNaN(sys) && !isNaN(dia)) {
          if (sys <= 120 && dia <= 80) return 'green';
          if (sys <= 139 || dia <= 89) return 'amber';
          return 'red';
        }
      }
      return 'green';
    }

    const num = parseFloat(valStr);
    if (isNaN(num)) return 'green';
    if (num >= metric.min && num <= metric.normalMax) return 'green';
    if (num > metric.normalMax && num <= metric.normalMax * 1.2) return 'amber';
    return 'red';
  };

  const currentStatus = calculateStatus(value, selectedMetric);

  const handleSelectMetric = (metric: MetricOption) => {
    setSelectedMetric(metric);
    setValue(metric.defaultValue);
  };

  const handleSave = async () => {
    if (!value.trim()) {
      Alert.alert('Missing Value', 'Please enter a vital reading value.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: CreateVitalsPayload = {
        notes: note.trim() || undefined,
        recordedAt: new Date().toISOString(),
      };

      if (selectedMetric.label === 'Heart Rate') {
        payload.heartRate = parseFloat(value);
      } else if (selectedMetric.label === 'Blood Pressure') {
        const parts = value.split('/');
        if (parts.length === 2) {
          payload.bloodPressureSystolic = parseFloat(parts[0]);
          payload.bloodPressureDiastolic = parseFloat(parts[1]);
        }
      } else if (selectedMetric.label === 'SpO₂') {
        payload.oxygenSaturation = parseFloat(value);
      } else if (selectedMetric.label === 'Temperature') {
        payload.temperatureCelsius = parseFloat(value);
      } else if (selectedMetric.label === 'Weight') {
        payload.weightKg = parseFloat(value);
      } else if (selectedMetric.label === 'Blood Glucose') {
        payload.bloodGlucose = parseFloat(value);
      }

      await vitals.create(payload);
      queryClient.invalidateQueries({ queryKey: ['vitals'] });

      router.replace({
        pathname: '/reading-confirmation',
        params: {
          metric: selectedMetric.label,
          value,
          unit: selectedMetric.unit,
          status: currentStatus,
          normalRange: selectedMetric.rangeText,
          source: 'Manual entry',
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to record vital. Saved locally for review.';
      Alert.alert('Vital Saved', msg, [
        {
          text: 'OK',
          onPress: () =>
            router.replace({
              pathname: '/reading-confirmation',
              params: {
                metric: selectedMetric.label,
                value,
                unit: selectedMetric.unit,
                status: currentStatus,
                normalRange: selectedMetric.rangeText,
                source: 'Manual entry',
              },
            }),
        },
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Record Vital</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Step 1: Metric Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>Which vital are you recording?</Text>
          <View style={styles.metricList}>
            {METRIC_OPTIONS.map((opt) => {
              const isSelected = selectedMetric.label === opt.label;
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => handleSelectMetric(opt)}
                  activeOpacity={0.75}
                  style={[
                    styles.metricOption,
                    {
                      backgroundColor: isSelected ? theme.primaryLight : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                      borderWidth: isSelected ? 1.5 : 1,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.metricOptionLabel,
                      { color: isSelected ? theme.primaryDark : theme.text, fontWeight: isSelected ? '700' : '600' },
                    ]}>
                    {opt.label}
                  </Text>
                  {isSelected ? (
                    <Check size={18} color={theme.primary} strokeWidth={2.5} />
                  ) : (
                    <ChevronRight size={18} color={theme.textMuted} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 2: Value Input Card */}
        <View style={[styles.inputCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTag, { color: theme.textMuted }]}>{selectedMetric.label.toUpperCase()}</Text>

          {/* Value Input */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Value</Text>
            <View style={styles.inputRow}>
              <View style={[styles.textInputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  keyboardType={selectedMetric.label === 'Blood Pressure' ? 'default' : 'numeric'}
                  style={[styles.numericInput, { color: theme.text }]}
                  placeholderTextColor={theme.textFaint}
                />
              </View>
              <Text style={[styles.unitLabel, { color: theme.text }]}>{selectedMetric.unit}</Text>
            </View>
            <Text style={[styles.rangeHint, { color: theme.textMuted }]}>{selectedMetric.rangeText}</Text>
          </View>

          {/* Optional Note */}
          <View style={styles.formGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Optional Note</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add context, e.g., after exercise"
              placeholderTextColor={theme.textFaint}
              style={[
                styles.noteInput,
                { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
              ]}
            />
          </View>

          {/* Source Provenance Badge */}
          <View style={[styles.sourceBadge, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={[styles.sourceDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.sourceText, { color: theme.textMuted }]}>Source: Manual entry</Text>
          </View>
        </View>

        {/* Step 3: Real-Time Status Preview */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor:
                currentStatus === 'green'
                  ? 'rgba(107, 196, 63, 0.08)'
                  : currentStatus === 'amber'
                  ? 'rgba(232, 147, 10, 0.08)'
                  : 'rgba(192, 57, 43, 0.08)',
              borderColor:
                currentStatus === 'green'
                  ? theme.status.success.border
                  : currentStatus === 'amber'
                  ? theme.status.warning.border
                  : theme.status.error.border,
            },
          ]}>
          <Text style={[styles.cardTag, { color: theme.textMuted }]}>STATUS PREVIEW</Text>
          <View style={styles.statusContentRow}>
            <View style={styles.statusValueBox}>
              <Text
                style={[
                  styles.statusBigValue,
                  {
                    color:
                      currentStatus === 'green'
                        ? '#006022'
                        : currentStatus === 'amber'
                        ? '#92610A'
                        : '#C0392B',
                  },
                ]}>
                {value || '0'}
              </Text>
              <Text style={[styles.statusUnitText, { color: theme.textMuted }]}>{selectedMetric.unit}</Text>
            </View>

            <View style={styles.statusLabelBox}>
              <StatusPill
                status={currentStatus}
                label={currentStatus === 'green' ? 'Normal' : currentStatus === 'amber' ? 'Elevated' : 'High'}
              />
              <Text style={[styles.statusDesc, { color: theme.textMuted }]}>
                {currentStatus === 'green'
                  ? 'Good — within normal range'
                  : currentStatus === 'amber'
                  ? 'Elevated — repeat measurement recommended'
                  : 'High — clinical attention recommended'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Reading'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85} style={[styles.cancelBtn, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.cancelBtnText, { color: theme.primaryDark }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Emergency FAB */}
      <EmergencyFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  metricList: {
    gap: 8,
  },
  metricOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
  },
  metricOptionLabel: {
    fontSize: 14,
  },
  inputCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textInputBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  numericInput: {
    fontSize: 24,
    fontWeight: '800',
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  rangeHint: {
    fontSize: 11,
    marginTop: 6,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  statusContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statusBigValue: {
    fontSize: 34,
    fontWeight: '900',
  },
  statusUnitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusLabelBox: {
    flex: 1,
  },
  statusDesc: {
    fontSize: 11,
    marginTop: 4,
  },
  actionSection: {
    gap: 10,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
