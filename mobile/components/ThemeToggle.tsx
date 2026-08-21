import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useThemeStore } from '@/lib/stores/themeStore';

interface ThemeToggleProps {
  size?: number;
}

export default function ThemeToggle({ size = 16 }: ThemeToggleProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={toggleTheme}
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#1D2939' : '#F2F4F7',
          borderColor: isDarkMode ? '#344054' : '#E4E7EC',
        },
      ]}>
      {isDarkMode ? (
        <Sun size={size} color="#FDB022" strokeWidth={2.2} />
      ) : (
        <Moon size={size} color="#344054" strokeWidth={2.2} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
