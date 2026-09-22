import { ReactNode, useEffect, useRef } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { analytics } from '@/lib/api';

interface TrackImpressionProps {
  elementId: string;
  featureArea?: string;
  elementType?: string;
  children: ReactNode;
  // ServiceCard/QuickActionButton size themselves via flex/explicit width
  // props from their parent grid — pass the same sizing here so wrapping
  // them in this View doesn't change the grid's layout.
  style?: StyleProp<ViewStyle>;
}

// Mobile counterpart of health-hub-africa/components/analytics/TrackImpression.tsx
// — but a deliberately WEAKER signal than the web version's real
// IntersectionObserver-based check (>=50% visible for a sustained 500ms).
// React Native has no built-in viewport-intersection primitive for an
// arbitrary View inside a ScrollView (only FlatList/SectionList get
// onViewableItemsChanged, and these screens don't use those); a real
// equivalent would mean adding a native module (e.g.
// react-native-intersection-observer) and validating it against this app's
// Expo dev-client build — a bigger infra decision than this component.
//
// So this fires cta_impression once per mount instead of once actually
// visible. That's an honest overcount risk for anything below the fold on
// a long scroll, which is why it's only wired to CTAs that render at or
// near the top of a phone-sized viewport today (Home tab quick actions,
// Services Hub grid). Swapping in a real visibility signal later only
// changes the trigger condition here, not the event shape or any
// downstream CTA CTR math.
export function TrackImpression({ elementId, featureArea, elementType, children, style }: TrackImpressionProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    analytics.track('cta_impression', { element_id: elementId, feature_area: featureArea, element_type: elementType });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <View style={style}>{children}</View>;
}
