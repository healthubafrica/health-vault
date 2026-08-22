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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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

const BAR_HEIGHT = 64;
const NOTCH_WIDTH = 78;
const NOTCH_HEIGHT = 20;
const CIRCLE_SIZE = 48;

export default function CurvedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const totalBarWidth = windowWidth;
  const tabWidth = totalBarWidth / state.routes.length;

  const activeIndex = state.index;
  const translateX = useSharedValue(activeIndex * tabWidth + tabWidth / 2);

  useEffect(() => {
    translateX.value = withSpring(activeIndex * tabWidth + tabWidth / 2, {
      damping: 16,
      stiffness: 140,
      mass: 0.7,
    });
  }, [activeIndex, tabWidth]);

  // Animated style for the upward curve dome
  const animatedNotchStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value - NOTCH_WIDTH / 2 }],
    };
  });

  // Animated style for the elevated circular active button
  const animatedCircleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value - CIRCLE_SIZE / 2 }],
    };
  });

  const activeRoute = state.routes[activeIndex];
  const ActiveIconComponent = TAB_ICONS[activeRoute.name] || Home;

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 8);

  return (
    <View style={[styles.outerContainer, { paddingBottom: bottomPadding }]} pointerEvents="box-none">
      {/* Tab Bar Card Surface */}
      <View
        style={[
          styles.barSurface,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            shadowColor: '#000000',
          },
        ]}>
        
        {/* Animated Smooth Upward Curved Notch */}
        <Animated.View style={[styles.notchWrapper, animatedNotchStyle]} pointerEvents="none">
          <Svg
            width={NOTCH_WIDTH}
            height={NOTCH_HEIGHT + 16}
            viewBox={`0 0 ${NOTCH_WIDTH} ${NOTCH_HEIGHT + 16}`}
            style={{ pointerEvents: 'none' as any }}>
            {/* Upward dome curve matching tab bar background */}
            <Path
              d={`M 0 ${NOTCH_HEIGHT} 
                 C 14 ${NOTCH_HEIGHT}, 20 2, 39 2 
                 C 58 2, 64 ${NOTCH_HEIGHT}, ${NOTCH_WIDTH} ${NOTCH_HEIGHT} 
                 L ${NOTCH_WIDTH} ${NOTCH_HEIGHT + 16} 
                 L 0 ${NOTCH_HEIGHT + 16} Z`}
              fill={theme.surface}
            />
            {/* Top border line along the curve */}
            <Path
              d={`M 0 ${NOTCH_HEIGHT} 
                 C 14 ${NOTCH_HEIGHT}, 20 2, 39 2 
                 C 58 2, 64 ${NOTCH_HEIGHT}, ${NOTCH_WIDTH} ${NOTCH_HEIGHT}`}
              stroke={theme.border}
              strokeWidth={1}
              fill="none"
            />
          </Svg>
        </Animated.View>

        {/* Animated Floating Elevated Active Circle */}
        <Animated.View style={[styles.floatingCircleWrapper, animatedCircleStyle]} pointerEvents="none">
          <View
            style={[
              styles.floatingCircle,
              {
                backgroundColor: theme.primary,
                shadowColor: theme.primary,
              },
            ]}>
            <ActiveIconComponent size={24} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </Animated.View>

        {/* Tab Items Row */}
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

  const animatedInactiveIconStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(focusAnim.value, [0, 1], [1, 0]),
      transform: [
        { scale: interpolate(focusAnim.value, [0, 1], [1, 0.6]) },
      ],
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabBtn}>
      
      {/* Inactive Icon (fades out when active since floating circle takes over) */}
      <View style={styles.iconSlot}>
        {!isFocused ? (
          <Animated.View style={animatedInactiveIconStyle}>
            <IconComponent
              size={22}
              color={theme.textMuted}
              strokeWidth={1.8}
            />
          </Animated.View>
        ) : (
          <View style={{ height: 22 }} />
        )}
      </View>

      {/* Tab Label */}
      <Text
        numberOfLines={1}
        style={[
          styles.tabLabel,
          {
            color: isFocused ? theme.primary : theme.textMuted,
            fontWeight: isFocused ? '700' : '500',
          },
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 9999,
  },
  barSurface: {
    height: BAR_HEIGHT,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: Platform.OS === 'ios' ? 0.5 : 0,
    borderRightWidth: Platform.OS === 'ios' ? 0.5 : 0,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
    position: 'relative',
    justifyContent: 'center',
  },
  notchWrapper: {
    position: 'absolute',
    top: -NOTCH_HEIGHT + 1,
    left: 0,
    width: NOTCH_WIDTH,
    height: NOTCH_HEIGHT + 16,
    alignItems: 'center',
    zIndex: 10,
  },
  floatingCircleWrapper: {
    position: 'absolute',
    top: -NOTCH_HEIGHT - 6,
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  floatingCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
    paddingHorizontal: 6,
    zIndex: 15,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 6,
    paddingBottom: 2,
  },
  iconSlot: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});

