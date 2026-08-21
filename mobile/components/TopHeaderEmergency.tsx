import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Phone } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import ThemeToggle from '@/components/ThemeToggle';

export default function TopHeaderEmergency() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.headerRightRow}>
      {/* Dark / Light Mode Switch */}
      <ThemeToggle />

      {/* SOS Button */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push('/emergency')}
        style={[
          styles.container,
          {
            backgroundColor: theme.status.emergency.background,
            borderColor: theme.status.emergency.border,
          },
        ]}>
        <View style={[styles.beacon, { backgroundColor: theme.status.emergency.text }]} />
        <Phone size={13} color={theme.status.emergency.text} />
        <Text style={[styles.label, { color: theme.status.emergency.text }]}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  beacon: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
