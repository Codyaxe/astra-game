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
  const lastLostLogRef = useRef(0);
  const lastValidPointerRef = useRef(null);
  const lastValidTimeRef = useRef(0);
  const velocityRef = useRef({ vx: 0, vy: 0, vz: 0 });

  const onResults = useCallback((results) => {
    const now = performance.now();

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      const lostElapsed = now - lastValidTimeRef.current;

      // Inertial Dead-Reckoning Extrapolation: Coast cursor along current velocity vector for up to 250ms
      if (lastValidPointerRef.current && lostElapsed < 250) {
        const dt = Math.min(lostElapsed / 1000, 0.033);
        const friction = Math.max(0, 1.0 - lostElapsed / 250); // smooth decay
        const extrapolatedX = Math.min(0.98, Math.max(0.02, lastValidPointerRef.current.x + velocityRef.current.vx * dt * friction));
        const extrapolatedY = Math.min(0.98, Math.max(0.02, lastValidPointerRef.current.y + velocityRef.current.vy * dt * friction));

        setPointer({
          x: extrapolatedX,
          y: extrapolatedY,
          z: lastValidPointerRef.current.z,
        });
      } else if (lostElapsed >= 250) {
        smootherRef.current.reset();
        setPointer(null);
        if (now - lastLostLogRef.current > 800) {
          lastLostLogRef.current = now;
          console.warn('[TRACKING] ⚠️ Hand lost (out of frame or resting)');
        }
      }
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const detection = detectorRef.current.update(landmarks);
    if (!detection) return;

    const { point, isForwardTilt, isNeutralTilt } = detection;
    const rawX = 1 - point.x;
    const rawY = point.y;
    const rawZ = point.z;

    // Teleportation Guard: If position jumps > 40% of screen in < 30ms, ignore the glitch frame
    if (lastValidPointerRef.current && (now - lastValidTimeRef.current) < 40) {
      const jumpDist = Math.hypot(rawX - lastValidPointerRef.current.x, rawY - lastValidPointerRef.current.y);
      if (jumpDist > 0.40) {
        return; // Reject glitch jump
      }
    }

    // Apply 1€ Dynamic Velocity-Adaptive Smoothing filter
    const smoothedPoint = smootherRef.current.smooth({
      x: rawX,
      y: rawY,
      z: rawZ,
    }, now);

    // Compute velocity vector for dead-reckoning extrapolation
    if (lastValidPointerRef.current && lastValidTimeRef.current > 0) {
      const dt = Math.max((now - lastValidTimeRef.current) / 1000, 0.001);
      velocityRef.current = {
        vx: (smoothedPoint.x - lastValidPointerRef.current.x) / dt,
        vy: (smoothedPoint.y - lastValidPointerRef.current.y) / dt,
        vz: ((smoothedPoint.z || 0) - (lastValidPointerRef.current.z || 0)) / dt,
      };
    }

    lastValidPointerRef.current = smoothedPoint;
    lastValidTimeRef.current = now;
    setPointer({ x: smoothedPoint.x, y: smoothedPoint.y, z: smoothedPoint.z });

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
        modelComplexity: 0, // 0 = Lite (ultra-fast inference, prevents frame drops during fast sweeps)
        minDetectionConfidence: 0.6, // High confidence eliminates background shadow jumping
        minTrackingConfidence: 0.5,  // Solid tracking
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      // Initialize native high-speed camera stream with 60 FPS hardware constraints
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
      let animFrameId = null;

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

        if ('requestVideoFrameCallback' in (videoRef.current || {})) {
          videoRef.current.requestVideoFrameCallback(processVideoFrame);
        } else {
          animFrameId = requestAnimationFrame(processVideoFrame);
        }
      };

      if ('requestVideoFrameCallback' in (videoRef.current || {})) {
        videoRef.current.requestVideoFrameCallback(processVideoFrame);
      } else {
        animFrameId = requestAnimationFrame(processVideoFrame);
      }

      cameraRef.current = {
        stop: () => {
          if (animFrameId) cancelAnimationFrame(animFrameId);
          stream.getTracks().forEach((track) => track.stop());
        },
      };

      console.log('[ASTRA] 📷 High-Speed Non-Blocking Video Pipeline running!');
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
