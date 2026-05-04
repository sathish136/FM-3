import { useColorScheme } from 'react-native';
import { palette, ColorScheme } from '@/constants/colors';

export function useColors(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? palette.dark : palette.light;
}
