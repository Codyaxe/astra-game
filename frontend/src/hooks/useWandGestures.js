/**
 * useWandGestures.js — Hook managing wand tracking & gesture state machine:
 *
 * State Machine:
 * - Tilt Forward -> ON_HOLD = true -> ON_DRAW = true (actively draws line toward wand)
 * - Untilt (Neutral) -> ON_DRAW = false, ON_HOLD = false -> registers completed "click"
 * - Left/Right Tilt -> fires onResetLines()
 * - Circle Motion -> fires onForceExit()
 * - Up/Down Shake -> triggers wand recalibration
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { GestureDetector } from '../tracking/gestureDetector';
import { getSharedHands } from '../services/mediaPipeService';

export function useWandGestures({
  enabled = false,
  onResetLines,
  onForceExit,
  onRecalibrate,
  onConnectionCycleComplete, // (fromNode, toNode)
}) {
  const videoRef = useRef(null);
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

    const { point, isForwardTilt, isNeutralTilt, isLeftRightTilt, isCircleMotion, isShakeUpDown } = detection;
    setPointer({ x: point.x, y: point.y, z: point.z });

    const now = Date.now();

    // 1. Shake Up/Down -> Recalibrate
    if (isShakeUpDown && now - lastActionTimeRef.current > 1500) {
      lastActionTimeRef.current = now;
      recalibrateWand();
      return;
    }

    // 2. Circle Motion -> Force Exit
    if (isCircleMotion && now - lastActionTimeRef.current > 2000) {
      lastActionTimeRef.current = now;
      setGestureStatus('Circle Gesture: Force Exit!');
      onForceExit?.();
      return;
    }

    // 3. Left / Right Tilt -> Reset current lines
    if (isLeftRightTilt && now - lastActionTimeRef.current > 1200) {
      lastActionTimeRef.current = now;
      setGestureStatus('Tilt Reset ↺');
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
      const hands = getSharedHands();
      if (!hands) return;

      hands.onResults(onResults);

      // eslint-disable-next-line no-undef
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (!cancelled && videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

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
