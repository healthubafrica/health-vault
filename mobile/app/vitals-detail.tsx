import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import TrendChart from '@/components/TrendChart';
import EmergencyFAB from '@/components/EmergencyFAB';
import { vitals, VitalsReading } from '@/lib/api';

type StatusColor = 'green' | 'amber' | 'red';

interface MetricConfig {
  field: keyof VitalsReading;
  unit: string;
  normalRange: string;
  status: (value: number) => StatusColor;
}

const METRIC_CONFIG: Record<string, MetricConfig> = {
  'Heart Rate': { field: 'heartRate', unit: 'bpm', normalRange: 'Normal range: 60–100 bpm', status: (v) => (v > 100 ? 'amber' : 'green') },
  'SpO₂': { field: 'spo2', unit: '%', normalRange: 'Normal range: 95–100%', status: (v) => (v < 94 ? 'red' : v < 96 ? 'amber' : 'green') },
  Temperature: { field: 'temperatureC', unit: '°C', normalRange: 'Normal range: 36.1–37.2 °C', status: (v) => (v > 38 ? 'amber' : 'green') },
  Weight: { field: 'weightKg', unit: 'kg', normalRange: 'Tracked over time', status: () => 'green' },
  'Blood Glucose': { field: 'bloodGlucose', unit: 'mmol/L', normalRange: 'Normal range: 4–7.8 mmol/L', status: (v) => (v > 11 ? 'red' : v > 7.8 ? 'amber' : 'green') },
};

const STATUS_LABEL: Record<StatusColor, string> = { green: 'Normal', amber: 'Elevated', red: 'High' };

export default function VitalsMetricDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ metric?: string }>();
  const metricTitle = params.metric && METRIC_CONFIG[params.metric] ? params.metric : 'Heart Rate';
  const config = METRIC_CONFIG[metricTitle];
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { data, isLoading } = useQuery({
    queryKey: ['vitals'],
    queryFn: () => vitals.list(),
  });

  // Oldest → newest, only readings that actually logged this metric.
  const readings = (data?.data ?? [])
    .filter((r) => r[config.field] != null)
    .slice()
    .reverse();

  const values = readings.map((r) => Number(r[config.field]));
  const latest = values[values.length - 1];
  const latestReading = readings[readings.length - 1];
  const latestStatus: StatusColor = latest != null ? config.status(latest) : 'green';
  const average = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header with Back Button */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <ChevronLeft size={22} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>{metricTitle}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {readings.length === 0 ? (
          <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>No {metricTitle.toLowerCase()} readings yet</Text>
          </View>
        ) : (
          <>
            {/* Current Reading Summary */}
            <View style={[styles.summaryCard, { backgroundColor: theme.primaryLight }]}>
              <View style={styles.summaryTop}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>CURRENT READING</Text>
                <Text style={[styles.summaryDate, { color: theme.textMuted }]}>
                  {new Date(latestReading.recordedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.valueRow}>
                <Text style={[styles.bigValue, { color: theme.primary }]}>{latest}</Text>
                <Text style={[styles.unitText, { color: theme.textMuted }]}>{config.unit}</Text>
              </View>

              <View style={styles.summaryBottom}>
                <StatusPill status={latestStatus} label={STATUS_LABEL[latestStatus]} />
              </View>
            </View>

            {/* Trend Chart */}
            <TrendChart title="Trend" normalRange={config.normalRange} dataPoints={values} />

            {/* 3-Column Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Average</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{average.toFixed(1)} {config.unit}</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Min</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{min} {config.unit}</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Max</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{max} {config.unit}</Text>
              </View>
            </View>

            {/* Reading History */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Reading History</Text>

              <View style={styles.historyList}>
                {readings.slice().reverse().map((reading) => {
                  const value = Number(reading[config.field]);
                  const status = config.status(value);
                  return (
                    <View
                      key={reading.id}
                      style={[styles.historyItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <View style={styles.historyLeft}>
                        <Text style={[styles.historyValue, { color: theme.text }]}>
                          {value} <Text style={styles.historyUnit}>{config.unit}</Text>
                        </Text>
                        <Text style={[styles.historyDate, { color: theme.textMuted }]}>
                          {new Date(reading.recordedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>

                      <View style={styles.historyRight}>
                        <View style={[styles.historyPill, { backgroundColor: theme.status[status === 'green' ? 'success' : status === 'amber' ? 'warning' : 'emergency'].background }]}>
                          <Text style={[styles.historyPillText, { color: theme.status[status === 'green' ? 'success' : status === 'amber' ? 'warning' : 'emergency'].text }]}>
                            {STATUS_LABEL[status]}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
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
  summaryCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  summaryDate: {
    fontSize: 11,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  bigValue: {
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 48,
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  historyLeft: {
    flex: 1,
  },
  historyValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  historyUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 11,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historySource: {
    fontSize: 11,
  },
});
