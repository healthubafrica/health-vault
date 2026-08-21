import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Text as SvgText, Polyline, Circle } from 'react-native-svg';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface TrendChartProps {
  title?: string;
  normalRange?: string;
  /** Real readings, oldest first. Renders a "not enough data" note instead of a fake line when fewer than 2 are given. */
  dataPoints?: number[];
}

export default function TrendChart({
  title = '7-Day Trend',
  normalRange = 'Normal range: 60–100 bpm',
  dataPoints = [],
}: TrendChartProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const hasData = dataPoints.length >= 2;
  const min = hasData ? Math.min(...dataPoints) : 0;
  const max = hasData ? Math.max(...dataPoints) : 0;
  const range = max - min || 1;
  // Plot area: x in [36, 270], y in [12, 95] (inverted — higher value = lower y)
  const dataCoords = hasData
    ? dataPoints.map((v, i) => ({
        x: 36 + (i * (270 - 36)) / (dataPoints.length - 1),
        y: 95 - ((v - min) / range) * (95 - 12),
      }))
    : [];
  const points = dataCoords.map((p) => `${p.x},${p.y}`).join(' ');
  const yAxisLabels = hasData
    ? [min, (min + max) / 2, max].map((v) => Math.round(v))
    : [60, 80, 100];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.textMuted }]}>{title.toUpperCase()}</Text>

      {/* SVG Chart */}
      {hasData ? (
        <View style={styles.chartWrapper}>
          <Svg width="100%" height="130" viewBox="0 0 280 120">
            {/* Grid Lines */}
            <Line x1="36" y1="95" x2="270" y2="95" stroke={theme.border} strokeWidth="1" />
            <Line x1="36" y1="53" x2="270" y2="53" stroke={theme.border} strokeWidth="1" strokeDasharray="3,3" />
            <Line x1="36" y1="12" x2="270" y2="12" stroke={theme.border} strokeWidth="1" />

            {/* Y-Axis Labels */}
            <SvgText x="28" y="99" fontSize="10" fill={theme.textMuted} textAnchor="end">
              {yAxisLabels[0]}
            </SvgText>
            <SvgText x="28" y="57" fontSize="10" fill={theme.textMuted} textAnchor="end">
              {yAxisLabels[1]}
            </SvgText>
            <SvgText x="28" y="16" fontSize="10" fill={theme.textMuted} textAnchor="end">
              {yAxisLabels[2]}
            </SvgText>

            {/* Trend Line */}
            <Polyline
              points={points}
              fill="none"
              stroke={theme.primary}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points */}
            {dataCoords.map((pt, i) => (
              <Circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill={theme.primary} />
            ))}
          </Svg>
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <Text style={[styles.emptyChartText, { color: theme.textMuted }]}>
            Not enough readings yet for a trend
          </Text>
        </View>
      )}

      {/* Reference Range Note */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={[styles.dot, { backgroundColor: theme.status.success.border }]} />
        <Text style={[styles.rangeText, { color: theme.textMuted }]}>{normalRange}</Text>
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
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
