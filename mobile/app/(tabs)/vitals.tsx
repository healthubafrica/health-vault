import { classifyBloodPressure } from '@/lib/vitalStatus';
import { latestWith } from '@/lib/vitals';
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
import { useRouter } from 'expo-router';
import { Plus, Activity } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { EmptyState, CardSkeleton, ErrorState } from '@/components/states';
import { vitals, VitalsReading } from '@/lib/api';


interface VitalMetric {
  metric: string;
  value: string | number;
  unit: string;
  status: 'green' | 'amber' | 'red';
  lastUpdate: string;
  source: 'Device' | 'Manual';
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

function mapVitalsToMetrics(readings: VitalsReading[]): VitalMetric[] {
  const metrics: VitalMetric[] = [];
  const num = (v: unknown) => Number(v); // Prisma Decimals arrive as strings

  // Each metric comes from the newest reading that actually contains it, with
  // its own "x ago" — not just from whichever row was saved last.
  const hr = latestWith(readings, (r) => r.heartRate != null);
  if (hr) metrics.push({ metric: 'Heart Rate', value: hr.heartRate!, unit: 'bpm', status: num(hr.heartRate) > 100 ? 'amber' : 'green', lastUpdate: timeAgo(hr.recordedAt), source: 'Manual' });

  const bp = latestWith(readings, (r) => r.systolicBp != null && r.diastolicBp != null);
  if (bp) metrics.push({ metric: 'Blood Pressure', value: `${bp.systolicBp}/${bp.diastolicBp}`, unit: 'mmHg', status: classifyBloodPressure(num(bp.systolicBp), num(bp.diastolicBp)), lastUpdate: timeAgo(bp.recordedAt), source: 'Manual' });

  const sp = latestWith(readings, (r) => r.spo2 != null);
  if (sp) metrics.push({ metric: 'SpO₂', value: num(sp.spo2), unit: '%', status: num(sp.spo2) < 94 ? 'red' : num(sp.spo2) < 96 ? 'amber' : 'green', lastUpdate: timeAgo(sp.recordedAt), source: 'Manual' });

  const t = latestWith(readings, (r) => r.temperatureC != null);
  if (t) metrics.push({ metric: 'Temperature', value: num(t.temperatureC), unit: '°C', status: num(t.temperatureC) > 38 ? 'amber' : 'green', lastUpdate: timeAgo(t.recordedAt), source: 'Manual' });

  const w = latestWith(readings, (r) => r.weightKg != null);
  if (w) metrics.push({ metric: 'Weight', value: num(w.weightKg), unit: 'kg', status: 'green', lastUpdate: timeAgo(w.recordedAt), source: 'Manual' });

  // Glucose is stored in mg/dL platform-wide (web portal, clinician alerts).
  const g = latestWith(readings, (r) => r.bloodGlucose != null);
  if (g) metrics.push({ metric: 'Blood Glucose', value: num(g.bloodGlucose), unit: 'mg/dL', status: num(g.bloodGlucose) > 180 || num(g.bloodGlucose) < 70 ? 'red' : num(g.bloodGlucose) > 140 ? 'amber' : 'green', lastUpdate: timeAgo(g.recordedAt), source: 'Manual' });

  return metrics;
}


export default function VitalsListFull() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['vitals'],
    queryFn: () => vitals.list(),
  });

  const VITALS_DATA: VitalMetric[] = mapVitalsToMetrics(data?.data ?? []);


  const getStatusColor = (status: 'green' | 'amber' | 'red') => {
    switch (status) {
      case 'green':
        return '#6DC43F';
      case 'amber':
        return '#E8930A';
      case 'red':
        return '#C0392B';
    }
  };

  const getCardBg = (status: 'green' | 'amber' | 'red') => {
    if (colorScheme === 'dark') {
      switch (status) {
        case 'green':
          return 'rgba(107, 196, 63, 0.08)';
        case 'amber':
          return 'rgba(232, 147, 10, 0.08)';
        case 'red':
          return 'rgba(192, 57, 43, 0.08)';
      }
    }
    switch (status) {
      case 'green':
        return 'rgba(107, 196, 63, 0.04)';
      case 'amber':
        return 'rgba(232, 147, 10, 0.04)';
      case 'red':
        return 'rgba(192, 57, 43, 0.04)';
    }
  };

  const getValueColor = (status: 'green' | 'amber' | 'red') => {
    if (colorScheme === 'dark') {
      switch (status) {
        case 'green':
          return '#8AE659';
        case 'amber':
          return '#F5B041';
        case 'red':
          return '#F5B041';
      }
    }
    switch (status) {
      case 'green':
        return '#006022';
      case 'amber':
        return '#92610A';
      case 'red':
        return '#C0392B';
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Vitals</Text>
          <View style={styles.headerRight}>
            <TopHeaderEmergency />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/record-vital')}
              style={[styles.addButton, { backgroundColor: theme.primary }]}>
              <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <CardSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : VITALS_DATA.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No vitals recorded yet"
            description="Tap + to log your first reading."
            primaryActionLabel="Record a Reading"
            onPrimaryAction={() => router.push('/record-vital')}
          />
        ) : (
          <View style={styles.grid}>
            {VITALS_DATA.map((vital) => {
              const statusColor = getStatusColor(vital.status);
              const cardBg = getCardBg(vital.status);
              const valueColor = getValueColor(vital.status);
              const isLongValue = vital.metric === 'Blood Pressure' || vital.metric === 'Weight/BMI';

              return (
                <TouchableOpacity
                  key={vital.metric}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (vital.metric === 'Blood Pressure') {
                      router.push('/blood-pressure-detail');
                    } else {
                      router.push({ pathname: '/vitals-detail', params: { metric: vital.metric } });
                    }
                  }}
                  style={[
                    styles.card,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}>
                  <View
                    style={[
                      StyleSheet.absoluteFillObject,
                      { backgroundColor: cardBg, borderRadius: 16 },
                    ]}
                  />
                  <View style={styles.cardTop}>
                    <Text numberOfLines={2} style={[styles.metricName, { color: theme.textMuted }]}>
                      {vital.metric}
                    </Text>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  </View>
                  <View style={styles.valueContainer}>
                    <Text style={[styles.valueText, { fontSize: isLongValue ? 16 : 22, color: valueColor }]}>
                      {vital.value}
                    </Text>
                    <Text style={[styles.unitText, { color: theme.textMuted }]}>{vital.unit}</Text>
                  </View>
                  <View style={styles.footerRow}>
                    <StatusPill
                      status={vital.status}
                      label={vital.status === 'green' ? 'Normal' : vital.status === 'amber' ? 'Elevated' : 'High'}
                    />
                    <Text style={[styles.timeText, { color: theme.textMuted }]}>{vital.lastUpdate}</Text>
                  </View>
                  <Text style={[styles.sourceText, { color: theme.textMuted }]}>{vital.source}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.instructionBox}>
          <Text style={[styles.instructionText, { color: theme.textMuted }]}>
            Tap any metric to view full trend history, reference ranges, and past readings.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 175,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 4,
  },
  metricName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
  },
  valueContainer: {
    marginTop: 6,
    marginBottom: 2,
  },
  valueText: {
    fontWeight: '800',
    lineHeight: 26,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  sourceText: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 2,
  },
  instructionBox: {
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 13,
    textAlign: 'center',
  },
});

