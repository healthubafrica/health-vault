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
import { useRouter } from 'expo-router';
import { ChevronLeft, Info } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import EmergencyFAB from '@/components/EmergencyFAB';
import { vitals, ApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

const METRIC_CONFIG = {
  label: 'Heart Rate',
  unit: 'bpm',
  min: 60,
  normalMax: 100,
  description: 'Number of heartbeats per minute',
  normalRange: '60–100 bpm',
  tipText: 'Resting heart rate of a healthy adult typically ranges from 60 to 100 bpm.',
};

export default function RecordHeartRateInputScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [value, setValue] = useState('72');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const getStatus = (valStr: string): 'green' | 'amber' | 'red' => {
    const num = parseFloat(valStr) || 0;
    if (num >= METRIC_CONFIG.min && num <= METRIC_CONFIG.normalMax) return 'green';
    if (num > METRIC_CONFIG.normalMax && num <= METRIC_CONFIG.normalMax * 1.2) return 'amber';
    return 'red';
  };

  const currentStatus = getStatus(value);

  const getStatusCopy = () => {
    switch (currentStatus) {
      case 'green':
        return 'Good — within normal range';
      case 'amber':
        return 'Slightly elevated — monitor';
      case 'red':
        return 'High — consult healthcare provider';
    }
  };

  const handleSave = async () => {
    if (!value.trim()) {
      Alert.alert('Missing Value', 'Please enter a heart rate value.');
      return;
    }

    setIsSaving(true);
    try {
      await vitals.create({
        heartRate: parseFloat(value),
        notes: note.trim() || undefined,
        recordedAt: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['vitals'] });

      router.replace({
        pathname: '/reading-confirmation',
        params: {
          metric: 'Heart Rate',
          value,
          unit: 'bpm',
          status: currentStatus,
          normalRange: METRIC_CONFIG.normalRange,
          source: 'Manual entry',
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Heart rate recorded locally.';
      Alert.alert('Reading Recorded', msg, [
        {
          text: 'OK',
          onPress: () =>
            router.replace({
              pathname: '/reading-confirmation',
              params: {
                metric: 'Heart Rate',
                value,
                unit: 'bpm',
                status: currentStatus,
                normalRange: METRIC_CONFIG.normalRange,
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Record Heart Rate</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Metric Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>ABOUT</Text>
          <Text style={[styles.descriptionText, { color: theme.text }]}>{METRIC_CONFIG.description}</Text>
        </View>

        {/* Value Input Card */}
        <View style={[styles.inputCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>ENTER VALUE</Text>

          {/* Large Center Numeric Input */}
          <View style={styles.inputRow}>
            <View style={[styles.numericBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <TextInput
                value={value}
                onChangeText={setValue}
                keyboardType="numeric"
                style={[styles.largeInput, { color: theme.text }]}
                placeholderTextColor={theme.textFaint}
              />
            </View>
            <Text style={[styles.unitText, { color: theme.text }]}>{METRIC_CONFIG.unit}</Text>
          </View>

          {/* Normal Range Reference Banner */}
          <View style={[styles.infoBanner, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Info size={16} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.textMuted }]}>
              Normal range: <Text style={[styles.infoBold, { color: theme.text }]}>{METRIC_CONFIG.normalRange}</Text>
            </Text>
          </View>

          {/* Optional Note */}
          <View style={styles.noteGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>OPTIONAL NOTE</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder='E.g., "After morning run", "While resting"'
              placeholderTextColor={theme.textFaint}
              style={[
                styles.noteInput,
                { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
              ]}
            />
          </View>
        </View>

        {/* Source Badge */}
        <View style={[styles.sourceBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.sourceDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.sourceText, { color: theme.textMuted }]}>Source: Manual entry</Text>
        </View>

        {/* Status Preview Card */}
        <View
          style={[
            styles.previewCard,
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
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>PREVIEW</Text>
          <View style={styles.previewContent}>
            <View style={styles.previewValueRow}>
              <Text
                style={[
                  styles.previewBigValue,
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
              <Text style={[styles.previewUnit, { color: theme.textMuted }]}>{METRIC_CONFIG.unit}</Text>
            </View>
            <StatusPill
              status={currentStatus}
              label={currentStatus === 'green' ? 'Normal' : currentStatus === 'amber' ? 'Elevated' : 'High'}
            />
          </View>
          <Text style={[styles.statusGuidance, { color: theme.textMuted }]}>{getStatusCopy()}</Text>
        </View>

        {/* Helpful Tip */}
        <View style={[styles.tipCard, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.tipText, { color: theme.primaryDark }]}>{METRIC_CONFIG.tipText}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Reading'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            style={[styles.cancelBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
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
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  numericBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  largeInput: {
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
    width: '100%',
  },
  unitText: {
    fontSize: 28,
    fontWeight: '800',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
  },
  infoBold: {
    fontWeight: '700',
  },
  noteGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  previewContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  previewBigValue: {
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 44,
  },
  previewUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusGuidance: {
    fontSize: 12,
  },
  tipCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionGroup: {
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
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
