import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { EMPTY_ANIMATIONS, type EmptyAnimationKey } from '@/lib/emptyAnimations';

interface EmptyAnimationProps {
  name: EmptyAnimationKey;
  size?: number;
}

/**
 * Decorative empty-state artwork. Honours the phone's "reduce motion" setting
 * by showing a still frame, and is hidden from screen readers (the title and
 * description beside it carry the meaning).
 */
export function EmptyAnimation({ name, size = 160 }: EmptyAnimationProps) {
  const scheme = useColorScheme() ?? 'light';
  const [reduceMotion, setReduceMotion] = useState(false);
  const art = EMPTY_ANIMATIONS[name];

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduceMotion(v))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View
      style={{ width: size, height: size, marginBottom: 8 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`empty-animation-${name}`}>
      {art.kind === 'lottie' ? (
        <LottieView
          source={art.source as never}
          style={{ width: size, height: size }}
          autoPlay={!reduceMotion}
          loop={!reduceMotion}
          progress={reduceMotion ? 0.5 : undefined}
        />
      ) : (
        <Image
          source={art.source}
          style={{ width: size, height: size }}
          contentFit="contain"
          autoplay={!reduceMotion}
          // Black line art disappears on dark surfaces, so tint it white there.
          tintColor={scheme === 'dark' && art.monochrome ? '#FFFFFF' : undefined}
        />
      )}
    </View>
  );
}
