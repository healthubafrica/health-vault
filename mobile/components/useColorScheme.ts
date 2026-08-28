import { useThemeStore } from '@/lib/stores/themeStore';

export const useColorScheme = (): 'light' | 'dark' => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  return isDarkMode ? 'dark' : 'light';
};

