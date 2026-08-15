/**
 * useWandGestures.js — Clean, High-Performance MediaPipe Wand Tracking
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

  const onResults = useCallback((results) => {
    const now = performance.now();

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      console.warn('[TRACKING] ⚠️ No hand detected by MediaPipe (out of frame or motion blur)');
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
    }, now);

    if (smoothedPoint) {
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
      if (!videoRef.current) return;

      if (typeof window === 'undefined' || !window.Hands) {
        console.warn('[ASTRA] MediaPipe library scripts not ready on window');
        return;
      }

      console.log('[ASTRA] 📷 Initializing MediaPipe Hands...');

      // eslint-disable-next-line no-undef
      const hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Lite model for ultra-low latency inference
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      // Request camera stream
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

      const processVideoFrame = async () => {
        if (cancelled) return;

        if (!isProcessing && videoRef.current && videoRef.current.readyState >= 2 && handsRef.current) {
          isProcessing = true;
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (e) {
            console.error('[ASTRA] Frame processing error:', e);
          } finally {
            isProcessing = false;
          }
        }

        if (videoRef.current && 'requestVideoFrameCallback' in videoRef.current) {
          frameCallbackId = videoRef.current.requestVideoFrameCallback(processVideoFrame);
        } else {
          frameCallbackId = requestAnimationFrame(processVideoFrame);
        }
      };

      if (videoRef.current && 'requestVideoFrameCallback' in videoRef.current) {
        frameCallbackId = videoRef.current.requestVideoFrameCallback(processVideoFrame);
      } else {
        frameCallbackId = requestAnimationFrame(processVideoFrame);
      }

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

      console.log('[ASTRA] 📷 Video tracking engine started successfully.');
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
