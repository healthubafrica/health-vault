import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import GenderAvatarArt from '@/components/GenderAvatarArt';
import { genderArt, initialsOf } from '@/lib/avatar';

interface AvatarProps {
  /** Uploaded photo URL (may be a short-lived signed URL). */
  uri?: string | null;
  name?: string | null;
  gender?: string | null;
  size?: number;
  /** Called when the photo fails to load (e.g. signed URL expired) so the owner can refetch. */
  onImageError?: () => void;
}

/**
 * Render order: photo (if it loads) -> gender artwork (if gender known) -> initials.
 * Always a circle; the photo is cover-fitted.
 */
export default function Avatar({ uri, name, gender, size = 48, onImageError }: AvatarProps) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const box = { width: size, height: size, borderRadius: size / 2 };
  const art = genderArt(gender);
  const trimmed = name?.trim() ?? '';

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.clip, box, { backgroundColor: theme.primaryLight }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={uri}
        accessible
        accessibilityLabel={trimmed ? `${trimmed} profile photo` : 'Profile photo'}
        onError={() => {
          setFailed(true);
          onImageError?.();
        }}
      />
    );
  }

  if (art) {
    return (
      <View style={[styles.clip, box]} accessible={false} importantForAccessibility="no-hide-descendants">
        <GenderAvatarArt art={art} size={size} />
      </View>
    );
  }

  return (
    <View
      style={[styles.clip, styles.center, box, { backgroundColor: theme.primaryLight }]}
      accessible
      accessibilityLabel={trimmed || 'Profile'}
    >
      <Text style={[styles.initials, { color: theme.primary, fontSize: Math.max(10, size * 0.36) }]}>
        {initialsOf(name) || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '800' },
});
