/**
 * useWandGestures.js — Clean, Single-Mount MediaPipe Wand Tracking
 *
 * Camera and MediaPipe Hands are initialized ONCE on mount (no infinite restart loop).
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { GestureDetector } from '../tracking/gestureDetector';
import { MotionSmoother } from '../tracking/motionSmoothing';

export function useWandGestures({
  enabled = true,
  onConnectionCycleComplete,
}) {
  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const detectorRef = useRef(new GestureDetector());
  const smootherRef = useRef(new MotionSmoother(1.2, 0.015, 1.0));
  const onCompleteRef = useRef(onConnectionCycleComplete);

  // Keep callback reference updated without triggering re-initialization
  useEffect(() => {
    onCompleteRef.current = onConnectionCycleComplete;
  }, [onConnectionCycleComplete]);

  const [pointer, setPointer] = useState(null);
  const [onHold, setOnHold] = useState(false);
  const [onDraw, setOnDraw] = useState(false);
  const [gestureStatus, setGestureStatus] = useState('Neutral');
  const [isReady, setIsReady] = useState(false);

  const holdRef = useRef(false);
  const drawRef = useRef(false);
  const lastActionTimeRef = useRef(0);

  const onResults = useCallback((results) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      smootherRef.current.reset();
      setPointer(null);
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const detection = detectorRef.current.update(landmarks);
    if (!detection) return;

    const { point, isForwardTilt, isNeutralTilt } = detection;

    // Apply 1€ Dynamic Velocity-Adaptive Smoothing filter (mirror X for natural mirror movement)
    const smoothedPoint = smootherRef.current.smooth({
      x: 1 - point.x,
      y: point.y,
      z: point.z,
    }, Date.now());
    setPointer({ x: smoothedPoint.x, y: smoothedPoint.y, z: smoothedPoint.z });

    const now = Date.now();

    // Forward / Back Tilt (Draw Line State Machine)
    if (isForwardTilt && !holdRef.current && now - lastActionTimeRef.current > 300) {
      holdRef.current = true;
      drawRef.current = true;
      lastActionTimeRef.current = now;
      setOnHold(true);
      setOnDraw(true);
      setGestureStatus('Drawing (Tilt Forward)');
    } else if (isNeutralTilt && holdRef.current && now - lastActionTimeRef.current > 250) {
      // Completed tilt -> untilt cycle: registers 1 deliberate click
      holdRef.current = false;
      drawRef.current = false;
      lastActionTimeRef.current = now;
      setOnHold(false);
      setOnDraw(false);
      setGestureStatus('Connected (Cycle Completed)');
      onCompleteRef.current?.();
      setTimeout(() => setGestureStatus('Neutral'), 600);
    }
  }, []); // Static callback — never changes identity

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function initCamera() {
      // Wait for video element to attach if not ready
      if (!videoRef.current) {
        setTimeout(() => {
          if (!cancelled) initCamera();
        }, 100);
        return;
      }

      if (typeof window === 'undefined' || !window.Hands || !window.Camera) {
        console.warn('[ASTRA] MediaPipe library scripts not ready on window');
        return;
      }

      console.log('[ASTRA] 📷 Initializing MediaPipe Hands & Camera stream (Single-Mount)...');

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
      console.log('[ASTRA] 📷 Webcam camera stream running smoothly!');
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
    onHold,
    onDraw,
    gestureStatus,
    isReady,
  };
}
