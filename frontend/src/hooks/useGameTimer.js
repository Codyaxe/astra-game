/**
 * useGameTimer.js — Countdown timer hook for challenge time limits.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * @param {number}   durationSec   — total seconds for the countdown
 * @param {Function} onExpire      — callback when timer hits 0
 * @returns {{ timeLeft, isRunning, start, stop, reset }}
 */
export function useGameTimer(durationSec, onExpire) {
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    setIsRunning(true);
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setTimeLeft(durationSec);
  }, [stop, durationSec]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stop();
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, stop, onExpire]);

  // Cleanup on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  return { timeLeft, isRunning, start, stop, reset };
}
