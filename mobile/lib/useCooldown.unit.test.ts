import { renderHook, act } from '@testing-library/react-native';
import { useCooldown } from './useCooldown';

describe('useCooldown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('counts down to zero after start', () => {
    const { result } = renderHook(() => useCooldown(3));
    expect(result.current.remaining).toBe(0);
    act(() => result.current.start());
    expect(result.current.remaining).toBe(3);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.remaining).toBe(1);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.remaining).toBe(0);
  });
});
