/**
 * useWandGestures.js — Hook managing wand tracking & gesture state machine:
 *
 * State Machine:
 * - Tilt Forward -> ON_HOLD = true -> ON_DRAW = true (actively draws line toward wand)
 * - Untilt (Neutral) -> ON_DRAW = false, ON_HOLD = false -> registers completed "click"
 * - Raise 2 Fingers -> fires onResetLines()
 * - Circle Motion -> fires onForceExit()
 * - Up/Down Shake -> triggers wand recalibration
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { GestureDetector } from '../tracking/gestureDetector';

export function useWandGestures({
  enabled = false,
  onResetLines,
  onForceExit,
  onRecalibrate,
  onConnectionCycleComplete, // (fromNode, toNode)
}) {
  const videoRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const detectorRef = useRef(new GestureDetector());

  const [pointer, setPointer] = useState(null); // { x, y, z }
  const [onHold, setOnHold] = useState(false);
  const [onDraw, setOnDraw] = useState(false);
  const [gestureStatus, setGestureStatus] = useState('Neutral');
  const [isReady, setIsReady] = useState(false);

  const holdRef = useRef(false);
  const drawRef = useRef(false);
  const lastActionTimeRef = useRef(0);

  const recalibrateWand = useCallback(() => {
    if (pointer) {
      detectorRef.current.recalibrate(pointer);
    }
    onRecalibrate?.();
    setGestureStatus('Recalibrated ↺');
    setTimeout(() => setGestureStatus('Neutral'), 1200);
  }, [pointer, onRecalibrate]);

  const onResults = useCallback((results) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setPointer(null);
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const detection = detectorRef.current.update(landmarks);
    if (!detection) return;

    const { point, isForwardTilt, isNeutralTilt, isTwoFingersUp, isCircleMotion, isShakeUpDown } = detection;
    // Convert camera-space X to screen-space X.
    setPointer({ x: 1 - point.x, y: point.y, z: point.z });

    const now = Date.now();

    // 1. Shake Up/Down -> Recalibrate
    if (isShakeUpDown && now - lastActionTimeRef.current > 1500) {
      lastActionTimeRef.current = now;
      recalibrateWand();
      return;
    }

    // 2. Circle Motion -> Force Exit
    if (isCircleMotion && now - lastActionTimeRef.current > 2000) {
      // lastActionTimeRef.current = now;
      // setGestureStatus('Circle Gesture: Force Exit!');
      // onForceExit?.();
      // return;
    }

    // 3. Raise 2 Fingers -> Reset current lines
    if (isTwoFingersUp && now - lastActionTimeRef.current > 1200) {
      lastActionTimeRef.current = now;
      setGestureStatus('Two-Finger Reset ↺');
      onResetLines?.();
      setTimeout(() => setGestureStatus('Neutral'), 1000);
      return;
    }

    // 4. Forward / Back Tilt (Draw Line State Machine)
    if (isForwardTilt && !holdRef.current) {
      holdRef.current = true;
      drawRef.current = true;
      setOnHold(true);
      setOnDraw(true);
      setGestureStatus('Drawing (Tilt Forward)');
    } else if (isNeutralTilt && holdRef.current) {
      // Completed tilt -> untilt cycle: registers 1 click and completes connection attempt
      holdRef.current = false;
      drawRef.current = false;
      setOnHold(false);
      setOnDraw(false);
      setGestureStatus('Connected (Cycle Completed)');
      onConnectionCycleComplete?.();
      setTimeout(() => setGestureStatus('Neutral'), 800);
    }
  }, [recalibrateWand, onForceExit, onResetLines, onConnectionCycleComplete]);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;
    let cancelled = false;

    async function initCamera() {
      // eslint-disable-next-line no-undef
      const hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);

      // eslint-disable-next-line no-undef
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (!cancelled && videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });

      handsRef.current = hands;
      cameraRef.current = camera;
      await camera.start();
      if (!cancelled) setIsReady(true);
    }

    initCamera().catch(console.error);

    return () => {
      cancelled = true;
      cameraRef.current?.stop();
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
    recalibrateWand,
  };
}
