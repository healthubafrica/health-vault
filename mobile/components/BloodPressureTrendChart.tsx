import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Text as SvgText, Polyline, Circle } from 'react-native-svg';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface BloodPressureTrendChartProps {
  /** Real readings, oldest first. Renders a "not enough data" note instead of a fake line when fewer than 2 are given. */
  systolic?: number[];
  diastolic?: number[];
}

function toCoords(values: number[], min: number, range: number) {
  return values.map((v, i) => ({
    x: 36 + (i * (270 - 36)) / Math.max(values.length - 1, 1),
    y: 115 - ((v - min) / range) * (115 - 25),
  }));
}

export default function BloodPressureTrendChart({ systolic = [], diastolic = [] }: BloodPressureTrendChartProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const hasData = systolic.length >= 2 && diastolic.length >= 2;
  const allValues = [...systolic, ...diastolic];
  const min = hasData ? Math.min(...allValues) : 60;
  const max = hasData ? Math.max(...allValues) : 150;
  const range = max - min || 1;
  const systolicCoords = hasData ? toCoords(systolic, min, range) : [];
  const diastolicCoords = hasData ? toCoords(diastolic, min, range) : [];
  const systolicPoints = systolicCoords.map((p) => `${p.x},${p.y}`).join(' ');
  const diastolicPoints = diastolicCoords.map((p) => `${p.x},${p.y}`).join(' ');
  const yAxisLabels = hasData ? [min, (min + max) / 2, max].map((v) => Math.round(v)) : [90, 120, 150];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.textMuted }]}>TREND</Text>

      {/* SVG Dual-line Chart */}
      {hasData ? (
      <View style={styles.chartWrapper}>
        <Svg width="100%" height="150" viewBox="0 0 280 140">
          {/* Grid Lines */}
          <Line x1="36" y1="115" x2="270" y2="115" stroke={theme.border} strokeWidth="1" />
          <Line x1="36" y1="70" x2="270" y2="70" stroke={theme.border} strokeWidth="1" strokeDasharray="3,3" />
          <Line x1="36" y1="25" x2="270" y2="25" stroke={theme.border} strokeWidth="1" />

          {/* Y-Axis Labels */}
          <SvgText x="28" y="119" fontSize="10" fill={theme.textMuted} textAnchor="end">
            {yAxisLabels[0]}
          </SvgText>
          <SvgText x="28" y="74" fontSize="10" fill={theme.textMuted} textAnchor="end">
            {yAxisLabels[1]}
          </SvgText>
          <SvgText x="28" y="29" fontSize="10" fill={theme.textMuted} textAnchor="end">
            {yAxisLabels[2]}
          </SvgText>

          {/* Systolic Line (Solid Primary) */}
          <Polyline
            points={systolicPoints}
            fill="none"
            stroke={theme.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Diastolic Line (Dashed Green) */}
          <Polyline
            points={diastolicPoints}
            fill="none"
            stroke="#6DC43F"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5,5"
          />

          {/* Systolic Circles */}
          {systolicCoords.map((pt, i) => (
            <Circle key={`sys-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill={theme.primary} />
          ))}

          {/* Diastolic Circles */}
          {diastolicCoords.map((pt, i) => (
            <Circle key={`dia-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill="#6DC43F" />
          ))}
        </Svg>
      </View>
      ) : (
        <View style={styles.emptyChart}>
          <Text style={[styles.legendText, { color: theme.textMuted }]}>Not enough readings yet for a trend</Text>
        </View>
      )}

      {/* Reference Ranges Legend */}
      <View style={[styles.legendBox, { borderTopColor: theme.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.legendText, { color: theme.textMuted }]}>
            Systolic: 90–120 mmHg (normal)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#6DC43F' }]} />
          <Text style={[styles.legendText, { color: theme.textMuted }]}>
            Diastolic: 60–80 mmHg (normal)
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  chartWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  emptyChart: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
