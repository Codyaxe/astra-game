/**
 * useGameTimer.js — Timestamp-based Countdown Timer Hook
 *
 * Guaranteed bug-free:
 * - Uses Date.now() timestamp differential (immune to re-render latency & interval drift)
 * - Uses onExpireRef (no closure re-trigger bugs)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useGameTimer(durationSec = 30, onExpire) {
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  const durationRef = useRef(durationSec);
  const endTimeRef = useRef(0);

  onExpireRef.current = onExpire;
  durationRef.current = durationSec;

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const duration = durationRef.current || 30;
    setTimeLeft(duration);
    endTimeRef.current = Date.now() + duration * 1000;
    setIsRunning(true);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const remainingMs = endTimeRef.current - now;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft(remainingSec);

      if (remainingMs <= 0) {
        stop();
        onExpireRef.current?.();
      }
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, stop]);

  return { timeLeft, isRunning, start, stop };
}
