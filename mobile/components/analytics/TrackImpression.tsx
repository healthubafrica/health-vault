import { ReactNode, useCallback, useRef } from 'react';
import { AppState, View, ViewStyle, StyleProp, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { analytics } from '@/lib/api';

interface TrackImpressionProps {
  elementId: string; featureArea?: string; elementType?: string;
  children: ReactNode; style?: StyleProp<ViewStyle>;
}
export function visibleFraction(x: number, y: number, width: number, height: number, screenWidth: number, screenHeight: number) {
  if (width <= 0 || height <= 0) return 0;
  const visibleWidth = Math.max(0, Math.min(x + width, screenWidth) - Math.max(0, x));
  const visibleHeight = Math.max(0, Math.min(y + height, screenHeight) - Math.max(0, y));
  return visibleWidth * visibleHeight / (width * height);
}

export function qualifiesImpression(fraction: number, visibleForMs: number) {
  return fraction >= 0.5 && visibleForMs >= 500;
}
/** Same qualification as web: >=50% visible for 500ms on a focused foreground screen. */
export function TrackImpression({ elementId, featureArea, elementType, children, style }: TrackImpressionProps) {
  const view = useRef<View>(null);
  const fired = useRef(new Set<string>());
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  useFocusEffect(useCallback(() => {
    let alive = true;
    let visibleSince: number | null = null;
    const sample = () => {
      if (fired.current.has(elementId) || !alive) return;
      if (AppState.currentState !== 'active') { visibleSince = null; return; }
      view.current?.measureInWindow((x, y, width, height) => {
        if (!alive) return;
        if (visibleFraction(x, y, width, height, screenWidth, screenHeight) < 0.5) { visibleSince = null; return; }
        const now = Date.now();
        visibleSince ??= now;
        if (!qualifiesImpression(visibleFraction(x, y, width, height, screenWidth, screenHeight), now - visibleSince)) return;
        fired.current.add(elementId);
        analytics.track('cta_impression', { element_id: elementId, feature_area: featureArea, element_type: elementType });
      });
    };
    const subscription = AppState.addEventListener('change', () => { visibleSince = null; });
    const timer = setInterval(sample, 100);
    sample();
    return () => { alive = false; clearInterval(timer); subscription.remove(); };
  }, [elementId, featureArea, elementType, screenWidth, screenHeight]));
  return <View ref={view} collapsable={false} style={style}>{children}</View>;
}
