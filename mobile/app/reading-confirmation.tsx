import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import StatusPill from '@/components/StatusPill';
import EmergencyFAB from '@/components/EmergencyFAB';

export default function ReadingSavedConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const metric = (params.metric as string) || 'Heart Rate';
  const value = (params.value as string) || '72';
  const unit = (params.unit as string) || 'bpm';
  const status = ((params.status as string) || 'green') as 'green' | 'amber' | 'red';
  const source = (params.source as string) || 'Manual entry';
  const normalRange = (params.normalRange as string) || (metric === 'Heart Rate' ? '60–100 bpm' : 'Standard clinical range');

  const now = new Date();
  const timeStr = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const dateStr = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

  const getStatusColor = () => {
    if (status === 'green') return '#006022';
    if (status === 'amber') return '#92610A';
    return '#C0392B';
  };

  const getStatusMessage = () => {
    if (status === 'green') return 'Normal — within healthy range';
    if (status === 'amber') return 'Slightly elevated — continue monitoring';
    return 'High — consult healthcare provider if persistent';
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header — Simplified centered title */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Reading Saved</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Success Icon Badge */}
        <View style={styles.iconWrapper}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(107, 196, 63, 0.12)' }]}>
            <CheckCircle2 size={48} color="#6DC43F" strokeWidth={2.2} />
          </View>
        </View>

        {/* Confirmation Text */}
        <Text style={[styles.confirmHeading, { color: theme.text }]}>Reading recorded successfully</Text>
        <Text style={[styles.timestampText, { color: theme.textMuted }]}>{timeStr}</Text>

        {/* Saved Value Card */}
        <View
          style={[
            styles.savedCard,
            {
              backgroundColor:
                status === 'green'
                  ? 'rgba(107, 196, 63, 0.08)'
                  : status === 'amber'
                  ? 'rgba(232, 147, 10, 0.08)'
                  : 'rgba(192, 57, 43, 0.08)',
              borderColor:
                status === 'green'
                  ? theme.status.success.border
                  : status === 'amber'
                  ? theme.status.warning.border
                  : theme.status.error.border,
            },
          ]}>
          <Text style={[styles.cardTag, { color: theme.textMuted }]}>YOUR READING</Text>
          
          <View style={styles.valueRow}>
            <View style={styles.valueGroup}>
              <Text style={[styles.bigValue, { color: getStatusColor() }]}>{value}</Text>
              <Text style={[styles.unitText, { color: theme.textMuted }]}>{unit}</Text>
            </View>
            <StatusPill
              status={status}
              label={status === 'green' ? 'Normal' : status === 'amber' ? 'Elevated' : 'High'}
            />
          </View>

          <Text style={[styles.statusMsg, { color: theme.textMuted }]}>{getStatusMessage()}</Text>
        </View>

        {/* Reading Details Table */}
        <View style={[styles.detailsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.detailRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>METRIC</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{metric}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>DATE & TIME</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{dateStr}, {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>NORMAL RANGE</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{normalRange}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>SOURCE</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{source}</Text>
          </View>
        </View>

        {/* Quick Trends Tip */}
        <View style={[styles.tipCard, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.tipText, { color: theme.primaryDark }]}>
            View trends in <Text style={{ fontWeight: '700' }}>Vitals</Text> to see your reading history and compare patterns over time.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/vitals')}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.primaryBtnText}>Back to Vitals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/record-vital')}
            activeOpacity={0.85}
            style={[styles.secondaryBtn, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.secondaryBtnText, { color: theme.primaryDark }]}>Record Another</Text>
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
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    alignItems: 'center',
  },
  iconWrapper: {
    marginTop: 16,
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmHeading: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  timestampText: {
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  savedCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
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
  statusMsg: {
    fontSize: 13,
  },
  detailsCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  tipCard: {
    width: '100%',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionGroup: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
