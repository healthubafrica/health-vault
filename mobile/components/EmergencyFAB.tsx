import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { PhoneCall } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function EmergencyFAB() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/emergency')}
        style={[
          styles.fab,
          {
            backgroundColor: theme.emergency,
            shadowColor: theme.emergency,
          },
        ]}>
        <PhoneCall size={22} color="#FFFFFF" strokeWidth={2.2} />
        <Text style={styles.label}>EMERGENCY</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 95 : 85,
    right: 16,
    zIndex: 999,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
