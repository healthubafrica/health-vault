import React from 'react';
import Svg, { Polyline } from 'react-native-svg';

interface MiniSparklineProps {
  status?: 'green' | 'amber' | 'red' | string;
  width?: number;
  height?: number;
}

export default function MiniSparkline({
  status = 'green',
  width = 48,
  height = 20,
}: MiniSparklineProps) {
  const colors: Record<string, string> = {
    green: '#6DC43F',
    amber: '#E8930A',
    red: '#C0392B',
  };

  const strokeColor = colors[status] || colors.green;

  return (
    <Svg width={width} height={height} viewBox="0 0 48 20" style={{ marginTop: 4, marginBottom: 4 }}>
      <Polyline
        points="2,16 6,12 10,14 14,8 18,11 22,9 26,13 30,10 34,15 38,11 42,14 46,12"
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
