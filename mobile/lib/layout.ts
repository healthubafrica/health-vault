import { Dimensions } from 'react-native';

// 2-column grid card width, accounting for screen padding + inter-card gap —
// was recomputed identically in every screen that renders a service grid.
export function getScreenCardWidth(horizontalPadding = 44): number {
  const { width } = Dimensions.get('window');
  return (width - horizontalPadding) / 2;
}
