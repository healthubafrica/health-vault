import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { Activity, Video, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export type QuickActionVariant = 'primary' | 'outlined' | 'tinted';

interface QuickActionButtonProps {
  icon: 'activity' | 'video' | 'calendar' | string;
  label: string;
  sublabel: string;
  variant?: QuickActionVariant;
  backgroundImage?: any;
  onPress?: () => void;
}

export default function QuickActionButton({
  icon,
  label,
  sublabel,
  variant = 'primary',
  backgroundImage,
  onPress,
}: QuickActionButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const renderIcon = (color: string) => {
    switch (icon) {
      case 'activity':
        return <Activity size={18} color={color} strokeWidth={2.4} />;
      case 'video':
        return <Video size={18} color={color} strokeWidth={2.4} />;
      case 'calendar':
        return <Calendar size={18} color={color} strokeWidth={2.4} />;
      default:
        return <Activity size={18} color={color} strokeWidth={2.4} />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          cardBg: theme.primary,
          borderWidth: 0,
          borderColor: 'transparent',
          iconBg: 'rgba(255, 255, 255, 0.25)',
          iconColor: '#FFFFFF',
          titleColor: '#FFFFFF',
          subColor: 'rgba(255, 255, 255, 0.85)',
        };
      case 'tinted':
        return {
          cardBg: theme.primaryLight,
          borderWidth: 1,
          borderColor: theme.border,
          iconBg: theme.surface,
          iconColor: theme.primary,
          titleColor: theme.text,
          subColor: theme.textMuted,
        };
      case 'outlined':
        return {
          cardBg: theme.surface,
          borderWidth: 1.5,
          borderColor: theme.primary,
          iconBg: theme.primaryLight,
          iconColor: theme.primary,
          titleColor: theme.text,
          subColor: theme.textMuted,
        };
    }
  };

  const v = getVariantStyles();

  if (backgroundImage) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={styles.cardWrapper}>
        <ImageBackground
          source={backgroundImage}
          style={styles.cardImageBg}
          imageStyle={styles.cardImage}>
          <LinearGradient
            colors={[
              'rgba(14, 74, 48, 0.55)',
              'rgba(10, 40, 20, 0.85)',
              'rgba(0, 0, 0, 0.92)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.imageOverlay}>
            <View style={styles.iconWrapperImage}>
              {renderIcon('#FFFFFF')}
            </View>
            <View style={styles.textContainer}>
              <Text numberOfLines={1} style={styles.titleImage}>
                {label}
              </Text>
              <Text numberOfLines={1} style={styles.subtitleImage}>
                {sublabel}
              </Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: v.cardBg,
          borderColor: v.borderColor,
          borderWidth: v.borderWidth,
        },
      ]}>
      <View style={[styles.iconWrapper, { backgroundColor: v.iconBg }]}>
        {renderIcon(v.iconColor)}
      </View>
      <View style={styles.textContainer}>
        <Text numberOfLines={1} style={[styles.title, { color: v.titleColor }]}>
          {label}
        </Text>
        <Text numberOfLines={1} style={[styles.subtitle, { color: v.subColor }]}>
          {sublabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    minHeight: 112,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  cardImageBg: {
    flex: 1,
    minHeight: 112,
  },
  cardImage: {
    borderRadius: 18,
    resizeMode: 'cover',
  },
  imageOverlay: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'space-between',
  },
  iconWrapperImage: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  titleImage: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15,
  },
  subtitleImage: {
    color: '#D0E8D0',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    flex: 1,
    minHeight: 104,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'space-between',
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  textContainer: {
    gap: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '500',
  },
});

