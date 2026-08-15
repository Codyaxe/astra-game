/**
 * useWandGestures.js — Manual Finger Control Hook
 *
 * Controls:
 * - Free cursor pointing with 1€ adaptive motion smoothing
 * - 2 Fingers Up -> Activates manual magnetic snap (isManualSnap = true)
 * - 3 Fingers Up -> Fires onResetAll()
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { GestureDetector } from '../tracking/gestureDetector';
import { MotionSmoother } from '../tracking/motionSmoothing';

export function useWandGestures({
  enabled = true,
  onResetAll,
  onManualSnapSelect, // fires when 2-finger snap locks/selects node
}) {
  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const detectorRef = useRef(new GestureDetector());
  const smootherRef = useRef(new MotionSmoother(1.2, 0.015, 1.0));

  const onResetRef = useRef(onResetAll);
  const onSnapSelectRef = useRef(onManualSnapSelect);

  useEffect(() => {
    onResetRef.current = onResetAll;
    onSnapSelectRef.current = onManualSnapSelect;
  }, [onResetAll, onManualSnapSelect]);

  const [pointer, setPointer] = useState(null);
  const [isManualSnap, setIsManualSnap] = useState(false);
  const [gestureStatus, setGestureStatus] = useState('Free Pointing (1 Finger)');
  const [isReady, setIsReady] = useState(false);

  const lastSnapActiveRef = useRef(false);
  const lastResetTimeRef = useRef(0);

  const onResults = useCallback((results) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      smootherRef.current.reset();
      setPointer(null);
      setIsManualSnap(false);
      lastSnapActiveRef.current = false;
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const detection = detectorRef.current.update(landmarks);
    if (!detection) return;

    const { point, isTwoFingersUp, isThreeFingersUp } = detection;

    // Apply 1€ Velocity-Adaptive Smoothing (mirror X for natural webcam tracking)
    const smoothed = smootherRef.current.smooth({
      x: 1 - point.x,
      y: point.y,
      z: point.z,
    }, Date.now());

    setPointer({ x: smoothed.x, y: smoothed.y, z: smoothed.z });

    const now = Date.now();

    // 1. Three Fingers Up -> Full Reset
    if (isThreeFingersUp && now - lastResetTimeRef.current > 1200) {
      lastResetTimeRef.current = now;
      setGestureStatus('Three-Finger Reset ↺');
      onResetRef.current?.();
      setTimeout(() => setGestureStatus('Free Pointing (1 Finger)'), 1000);
      return;
    }

    // 2. Two Fingers Up -> Manual Magnetic Snap
    if (isTwoFingersUp) {
      if (!lastSnapActiveRef.current) {
        lastSnapActiveRef.current = true;
        setIsManualSnap(true);
        setGestureStatus('Manual Snap Active (✌️ 2 Fingers)');
        onSnapSelectRef.current?.('snap_start');
      }
    } else {
      if (lastSnapActiveRef.current) {
        lastSnapActiveRef.current = false;
        setIsManualSnap(false);
        setGestureStatus('Free Pointing (1 Finger)');
        onSnapSelectRef.current?.('snap_release');
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function initCamera() {
      if (!videoRef.current) {
        setTimeout(() => {
          if (!cancelled) initCamera();
        }, 100);
        return;
      }

      if (typeof window === 'undefined' || !window.Hands || !window.Camera) {
        console.warn('[ASTRA] MediaPipe scripts loading...');
        return;
      }

      console.log('[ASTRA] 📷 Initializing MediaPipe Hands & Camera...');

      // eslint-disable-next-line no-undef
      const hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      // eslint-disable-next-line no-undef
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (!cancelled && videoRef.current && handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });

      cameraRef.current = camera;
      await camera.start();
      console.log('[ASTRA] 📷 Webcam camera running smoothly!');
      if (!cancelled) setIsReady(true);
    }

    initCamera().catch((err) => {
      console.error('[ASTRA] Camera init failed:', err);
    });

    return () => {
      cancelled = true;
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      setIsReady(false);
    };
  }, [enabled, onResults]);

  return {
    videoRef,
    pointer,
    isManualSnap,
    gestureStatus,
    isReady,
  };
}
