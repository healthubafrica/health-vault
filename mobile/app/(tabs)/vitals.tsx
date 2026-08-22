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
import MiniSparkline from '@/components/MiniSparkline';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { EmptyState, CardSkeleton } from '@/components/states';
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

function mapVitalsToMetrics(reading: VitalsReading): VitalMetric[] {
  const metrics: VitalMetric[] = [];
  const ts = timeAgo(reading.recordedAt);

  if (reading.heartRate != null)
    metrics.push({ metric: 'Heart Rate', value: reading.heartRate, unit: 'bpm', status: reading.heartRate > 100 ? 'amber' : 'green', lastUpdate: ts, source: 'Manual' });
  if (reading.systolicBp != null && reading.diastolicBp != null)
    metrics.push({ metric: 'Blood Pressure', value: `${reading.systolicBp}/${reading.diastolicBp}`, unit: 'mmHg', status: reading.systolicBp > 140 ? 'red' : reading.systolicBp > 130 ? 'amber' : 'green', lastUpdate: ts, source: 'Manual' });
  if (reading.spo2 != null)
    metrics.push({ metric: 'SpO₂', value: reading.spo2, unit: '%', status: reading.spo2 < 94 ? 'red' : reading.spo2 < 96 ? 'amber' : 'green', lastUpdate: ts, source: 'Manual' });
  if (reading.temperatureC != null)
    metrics.push({ metric: 'Temperature', value: reading.temperatureC, unit: '°C', status: reading.temperatureC > 38 ? 'amber' : 'green', lastUpdate: ts, source: 'Manual' });
  if (reading.weightKg != null)
    metrics.push({ metric: 'Weight', value: reading.weightKg, unit: 'kg', status: 'green', lastUpdate: ts, source: 'Manual' });
  if (reading.bloodGlucose != null)
    metrics.push({ metric: 'Blood Glucose', value: reading.bloodGlucose, unit: 'mmol/L', status: reading.bloodGlucose > 11 ? 'red' : reading.bloodGlucose > 7.8 ? 'amber' : 'green', lastUpdate: ts, source: 'Manual' });

  return metrics;
}


export default function VitalsListFull() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vitals'],
    queryFn: () => vitals.list(),
  });

  const latestReading = data?.data?.[0];
  const VITALS_DATA: VitalMetric[] = latestReading ? mapVitalsToMetrics(latestReading) : [];


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
                  <MiniSparkline status={vital.status} width={64} height={20} />
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

