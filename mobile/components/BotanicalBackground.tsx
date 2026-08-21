import React from 'react';
import { StyleSheet, View, ViewStyle, Dimensions } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';

interface BotanicalBackgroundProps {
  style?: ViewStyle;
  showClover?: boolean;
  opacity?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BotanicalBackground({
  style,
  showClover = true,
  opacity = 1,
}: BotanicalBackgroundProps) {
  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 700"
        preserveAspectRatio="xMidYMid slice"
        pointerEvents="none"
        style={{ opacity, pointerEvents: 'none' as any }}>
        
        {/* Subtle Clover / Health Watermark in Background */}
        {showClover && (
          <G opacity="0.05" transform="translate(140, 160) scale(1.4)">
            {/* Top Leaf */}
            <Path
              d="M 50 50 C 35 15, 65 15, 50 50 Z"
              fill="#FFFFFF"
              transform="translate(0, -28)"
            />
            {/* Bottom Leaf */}
            <Path
              d="M 50 50 C 35 85, 65 85, 50 50 Z"
              fill="#FFFFFF"
              transform="translate(0, 28)"
            />
            {/* Left Leaf */}
            <Path
              d="M 50 50 C 15 35, 15 65, 50 50 Z"
              fill="#FFFFFF"
              transform="translate(-28, 0)"
            />
            {/* Right Leaf */}
            <Path
              d="M 50 50 C 85 35, 85 65, 50 50 Z"
              fill="#FFFFFF"
              transform="translate(28, 0)"
            />
            {/* Large Soft Petals */}
            <Circle cx="50" cy="22" r="24" fill="#FFFFFF" />
            <Circle cx="50" cy="78" r="24" fill="#FFFFFF" />
            <Circle cx="22" cy="50" r="24" fill="#FFFFFF" />
            <Circle cx="78" cy="50" r="24" fill="#FFFFFF" />
          </G>
        )}

        {/* Botanical Foliage - Left Small Branch */}
        <G transform="translate(40, 520) scale(0.65)" opacity="0.45">
          <Path
            d="M 40 180 Q 50 90 70 10"
            stroke="#5FA391"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Leaves */}
          <Path d="M 68 12 C 50 2, 40 25, 65 30 Z" fill="#5FA391" />
          <Path d="M 70 12 C 88 5, 95 28, 72 32 Z" fill="#5FA391" />
          
          <Path d="M 62 55 C 40 45, 32 68, 58 72 Z" fill="#5FA391" />
          <Path d="M 64 55 C 84 48, 92 70, 68 76 Z" fill="#5FA391" />
          
          <Path d="M 54 100 C 32 90, 24 112, 50 118 Z" fill="#5FA391" />
          <Path d="M 56 100 C 76 92, 84 115, 60 120 Z" fill="#5FA391" />
          
          <Path d="M 46 145 C 24 135, 16 158, 42 164 Z" fill="#5FA391" />
          <Path d="M 48 145 C 68 138, 76 160, 52 166 Z" fill="#5FA391" />
        </G>

        {/* Botanical Foliage - Main Center-Right Branch */}
        <G transform="translate(100, 390) scale(0.95)" opacity="0.6">
          <Path
            d="M 50 300 Q 110 170 160 20"
            stroke="#5FA391"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Top Leaf Tip */}
          <Path d="M 160 20 C 145 -5, 175 -5, 160 20 Z" fill="#66AB99" />
          
          {/* Leaf Pair 1 */}
          <Path d="M 154 36 C 120 18, 108 55, 148 58 Z" fill="#66AB99" />
          <Path d="M 158 38 C 190 20, 202 58, 162 62 Z" fill="#66AB99" />
          
          {/* Leaf Pair 2 */}
          <Path d="M 142 85 C 104 65, 92 105, 134 110 Z" fill="#66AB99" />
          <Path d="M 146 88 C 182 70, 194 110, 152 114 Z" fill="#66AB99" />
          
          {/* Leaf Pair 3 */}
          <Path d="M 126 140 C 85 118, 72 160, 116 166 Z" fill="#66AB99" />
          <Path d="M 130 144 C 168 124, 180 165, 138 170 Z" fill="#66AB99" />
          
          {/* Leaf Pair 4 */}
          <Path d="M 106 198 C 62 175, 48 218, 96 226 Z" fill="#66AB99" />
          <Path d="M 110 202 C 150 180, 162 224, 118 230 Z" fill="#66AB99" />

          {/* Leaf Pair 5 */}
          <Path d="M 82 258 C 38 235, 24 278, 72 286 Z" fill="#66AB99" />
          <Path d="M 86 262 C 126 240, 138 284, 94 290 Z" fill="#66AB99" />
        </G>

        {/* Botanical Foliage - Far Right Branch */}
        <G transform="translate(260, 310) scale(0.85)" opacity="0.5">
          <Path
            d="M 50 300 Q 80 160 110 20"
            stroke="#5FA391"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Leaves */}
          <Path d="M 108 24 C 84 8, 74 42, 102 46 Z" fill="#5FA391" />
          <Path d="M 110 26 C 134 12, 144 45, 114 48 Z" fill="#5FA391" />
          
          <Path d="M 98 75 C 72 58, 60 92, 92 98 Z" fill="#5FA391" />
          <Path d="M 100 78 C 126 62, 136 96, 104 102 Z" fill="#5FA391" />
          
          <Path d="M 86 130 C 58 112, 46 148, 78 154 Z" fill="#5FA391" />
          <Path d="M 88 134 C 116 118, 126 152, 94 158 Z" fill="#5FA391" />

          <Path d="M 72 190 C 42 172, 30 208, 64 214 Z" fill="#5FA391" />
          <Path d="M 74 194 C 104 178, 114 212, 80 218 Z" fill="#5FA391" />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
