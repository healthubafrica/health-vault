import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import {
  Home,
  Activity,
  Folder,
  Video,
  User,
  LayoutGrid,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const TAB_ICONS: Record<string, any> = {
  index: Home,
  vitals: Activity,
  services: LayoutGrid,
  'services-hub': LayoutGrid,
  records: Folder,
  telecare: Video,
  profile: User,
};

const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  vitals: 'Vitals',
  services: 'Services',
  'services-hub': 'Services',
  records: 'Records',
  telecare: 'TeleCare',
  profile: 'Profile',
};

const BAR_MARGIN = 16;
const BAR_HEIGHT = 62;
const NOTCH_WIDTH = 76;
const NOTCH_HEIGHT = 16;

export default function CurvedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const totalBarWidth = windowWidth - BAR_MARGIN * 2;
  const tabWidth = totalBarWidth / state.routes.length;

  const activeIndex = state.index;
  const translateX = useSharedValue(activeIndex * tabWidth + tabWidth / 2);

  useEffect(() => {
    translateX.value = withSpring(activeIndex * tabWidth + tabWidth / 2, {
      damping: 15,
      stiffness: 120,
      mass: 0.8,
    });
  }, [activeIndex, tabWidth]);

  const animatedNotchStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value - NOTCH_WIDTH / 2 }],
    };
  });

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View
        style={[
          styles.barContainer,
          {
            width: totalBarWidth,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: '#000000',
          },
        ]}>
        
        {/* Animated Curved Top Wave Notch & Floating Dot */}
        <Animated.View style={[styles.notchWrapper, animatedNotchStyle]} pointerEvents="none">
          <Svg
            width={NOTCH_WIDTH}
            height={NOTCH_HEIGHT + 14}
            viewBox={`0 0 ${NOTCH_WIDTH} ${NOTCH_HEIGHT + 14}`}
            pointerEvents="none"
            style={{ pointerEvents: 'none' as any }}>
            {/* Smooth upward arching Bezier curve blending into the top edge */}
            <Path
              d={`M 0 ${NOTCH_HEIGHT} 
                 C 14 ${NOTCH_HEIGHT}, 20 2, 38 2 
                 C 56 2, 62 ${NOTCH_HEIGHT}, ${NOTCH_WIDTH} ${NOTCH_HEIGHT} 
                 L ${NOTCH_WIDTH} ${NOTCH_HEIGHT + 14} 
                 L 0 ${NOTCH_HEIGHT + 14} Z`}
              fill={theme.surface}
            />
            {/* Subtle highlight border curve matching bar border */}
            <Path
              d={`M 0 ${NOTCH_HEIGHT} 
                 C 14 ${NOTCH_HEIGHT}, 20 2, 38 2 
                 C 56 2, 62 ${NOTCH_HEIGHT}, ${NOTCH_WIDTH} ${NOTCH_HEIGHT}`}
              stroke={theme.border}
              strokeWidth={1}
              fill="none"
            />
          </Svg>

          {/* Floating Indicator Dot */}
          <View style={styles.dotContainer}>
            <View style={[styles.floatingDot, { backgroundColor: theme.primary }]} />
          </View>
        </Animated.View>

        {/* Tab Buttons Row */}
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const IconComponent = TAB_ICONS[route.name] || Home;
            const label = TAB_LABELS[route.name] || route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, { merge: true } as any);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabButton
                key={route.key}
                isFocused={isFocused}
                IconComponent={IconComponent}
                label={label}
                onPress={onPress}
                onLongPress={onLongPress}
                theme={theme}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface TabButtonProps {
  isFocused: boolean;
  IconComponent: any;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  theme: any;
}

function TabButton({
  isFocused,
  IconComponent,
  label,
  onPress,
  onLongPress,
  theme,
}: TabButtonProps) {
  const focusAnim = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    focusAnim.value = withSpring(isFocused ? 1 : 0, {
      damping: 14,
      stiffness: 140,
    });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(focusAnim.value, [0, 1], [0, -5]) },
        { scale: interpolate(focusAnim.value, [0, 1], [1, 1.12]) },
      ],
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      opacity: focusAnim.value,
      transform: [
        { translateY: interpolate(focusAnim.value, [0, 1], [4, 0]) },
      ],
      height: interpolate(focusAnim.value, [0, 1], [0, 14]),
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabBtn}>
      <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
        <IconComponent
          size={22}
          color={isFocused ? theme.primary : theme.textMuted}
          strokeWidth={isFocused ? 2.2 : 1.8}
        />
      </Animated.View>

      {/* Active-Only Animated Label */}
      <Animated.View style={[styles.labelContainer, animatedLabelStyle]}>
        {isFocused && (
          <Text
            numberOfLines={1}
            style={[
              styles.tabLabel,
              { color: theme.primary, fontWeight: '700' },
            ]}>
            {label}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 12,
  },
  barContainer: {
    height: BAR_HEIGHT,
    borderRadius: 30,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
    position: 'relative',
    justifyContent: 'center',
    zIndex: 10000,
  },
  notchWrapper: {
    position: 'absolute',
    top: -NOTCH_HEIGHT + 1,
    left: 0,
    width: NOTCH_WIDTH,
    height: NOTCH_HEIGHT + 14,
    alignItems: 'center',
  },
  dotContainer: {
    position: 'absolute',
    top: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 4,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
});
