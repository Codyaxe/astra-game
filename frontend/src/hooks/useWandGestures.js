/**
 * useWandGestures.js — Robust, High-Performance MediaPipe Wand Tracking
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
  const smootherRef = useRef(new MotionSmoother(1.2, 0.05, 1.0));
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
  const lastDetectedTimeRef = useRef(0);
  const lastWarnTimeRef = useRef(0);
  const lastValidPointerRef = useRef(null);
  const lastValidTimeRef = useRef(0);
  const velocityRef = useRef({ vx: 0, vy: 0 });

  const onResults = useCallback((results) => {
    const now = performance.now();

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      if (now - lastWarnTimeRef.current > 600) {
        lastWarnTimeRef.current = now;
        console.warn('[TRACKING] ⚠️ No hand detected by MediaPipe (out of frame or motion blur)');
      }

      const lostElapsed = now - lastDetectedTimeRef.current;
      // Trajectory History Buffer Kinematic Dead-Reckoning Extrapolation
      const pred = smootherRef.current.extrapolate(now);
      if (pred && lostElapsed < 280) {
        setPointer({ x: pred.x, y: pred.y, z: pred.z });
      } else if (lostElapsed >= 600) {
        smootherRef.current.reset();
        setPointer(null);
      }
      return;
    }

    lastDetectedTimeRef.current = now;
    const landmarks = results.multiHandLandmarks[0];
    const detection = detectorRef.current.update(landmarks);
    if (!detection) return;

    const { point, isForwardTilt, isNeutralTilt } = detection;

    // Apply 1€ Dynamic Velocity-Adaptive Smoothing filter (mirror X for natural mirror movement)
    const smoothedPoint = smootherRef.current.smooth({
      x: 1 - point.x,
      y: point.y,
      z: point.z,
    }, now);

    if (smoothedPoint) {
      // Calculate velocity vector for dead-reckoning extrapolation
      if (lastValidPointerRef.current && lastValidTimeRef.current > 0) {
        const dt = Math.max((now - lastValidTimeRef.current) / 1000, 0.001);
        velocityRef.current = {
          vx: (smoothedPoint.x - lastValidPointerRef.current.x) / dt,
          vy: (smoothedPoint.y - lastValidPointerRef.current.y) / dt,
        };
      }

      lastValidPointerRef.current = smoothedPoint;
      lastValidTimeRef.current = now;
      setPointer({ x: smoothedPoint.x, y: smoothedPoint.y, z: smoothedPoint.z });
    }

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
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function initCamera() {
      // Wait for video element and MediaPipe Hands library to be ready on window
      if (!videoRef.current || typeof window === 'undefined' || !window.Hands) {
        setTimeout(() => {
          if (!cancelled) initCamera();
        }, 100);
        return;
      }

      console.log('[ASTRA] 📷 Initializing MediaPipe Hands & Camera stream...');

      // eslint-disable-next-line no-undef
      const hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Lite model for lowest latency
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      // Start hardware video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 60, min: 30 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      let isProcessing = false;
      let frameCallbackId = null;

      const scheduleNextFrame = () => {
        if (cancelled || !videoRef.current) return;
        if ('requestVideoFrameCallback' in videoRef.current) {
          frameCallbackId = videoRef.current.requestVideoFrameCallback(processVideoFrame);
        } else {
          frameCallbackId = requestAnimationFrame(processVideoFrame);
        }
      };

      const processVideoFrame = async () => {
        if (cancelled) return;

        if (!isProcessing && videoRef.current && videoRef.current.readyState >= 2 && handsRef.current) {
          isProcessing = true;
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (e) {
            console.error('[ASTRA] Frame send error:', e);
          } finally {
            isProcessing = false;
          }
        }

        scheduleNextFrame();
      };

      scheduleNextFrame();

      cameraRef.current = {
        stop: () => {
          if (videoRef.current && 'cancelVideoFrameCallback' in videoRef.current && frameCallbackId) {
            videoRef.current.cancelVideoFrameCallback(frameCallbackId);
          } else if (frameCallbackId) {
            cancelAnimationFrame(frameCallbackId);
          }
          stream.getTracks().forEach((track) => track.stop());
        },
      };

      console.log('[ASTRA] 📷 Camera stream and MediaPipe pipeline initialized successfully!');
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
