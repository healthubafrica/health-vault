import { useCallback, useEffect, useRef, useState } from 'react';

/** Seconds a user must wait between resend-code taps. */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Counts down from `seconds` after `start()`; `remaining === 0` means ready. */
export function useCooldown(seconds: number = RESEND_COOLDOWN_SECONDS) {
  const [remaining, setRemaining] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const start = useCallback(() => {
    stop();
    setRemaining(seconds);
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          stop();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }, [seconds]);

  useEffect(() => stop, []);

  return { remaining, start };
}
