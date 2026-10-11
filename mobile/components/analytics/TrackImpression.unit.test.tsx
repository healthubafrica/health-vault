import { Text, AppState } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { TrackImpression, qualifiesImpression, visibleFraction } from './TrackImpression';
import { analytics } from '@/lib/api';
jest.mock('@/lib/api', () => ({ analytics: { track: jest.fn() } }));
jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]) }));
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); AppState.currentState = 'active'; });
afterEach(() => { jest.useRealTimers(); });
it('does not count an unmeasured mount as an impression', () => {
  const screen = render(<TrackImpression elementId="card"><Text>Card</Text></TrackImpression>);
  act(() => jest.advanceTimersByTime(1000));
  expect(analytics.track).not.toHaveBeenCalled();
  screen.unmount();
});
it('qualifies half-visible views and rejects below-fold views', () => {
  expect(visibleFraction(0, 400, 100, 200, 400, 500)).toBe(0.5);
  expect(visibleFraction(0, 600, 100, 200, 400, 500)).toBe(0);
  expect(visibleFraction(-50, 0, 100, 100, 400, 500)).toBe(0.5);
  expect(visibleFraction(0, 0, 0, 100, 400, 500)).toBe(0);
});
it('requires both half visibility and a sustained 500ms dwell', () => {
  expect(qualifiesImpression(0.49, 1000)).toBe(false);
  expect(qualifiesImpression(0.5, 499)).toBe(false);
  expect(qualifiesImpression(0.5, 500)).toBe(true);
});
