/**
 * useWandTracking.js — Custom hook wrapping MediaPipe Hands
 * to track a magic wand (or index finger tip) via webcam.
 *
 * Exports the current pointer position and a ref to the video element.
 */

import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * @param {boolean} enabled — whether tracking should be active
 * @returns {{ videoRef, pointer, isReady }}
 */
export function useWandTracking(enabled = false) {
  const videoRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const [pointer, setPointer] = useState(null);   // { x, y }  normalised 0–1
  const [isReady, setIsReady] = useState(false);

  const onResults = useCallback((results) => {
    if (
      results.multiHandLandmarks &&
      results.multiHandLandmarks.length > 0
    ) {
      // Landmark 8 = INDEX_FINGER_TIP (or wand tip)
      const tip = results.multiHandLandmarks[0][8];
      // Convert camera-space X to screen-space X.
      setPointer({ x: 1 - tip.x, y: tip.y });
    } else {
      setPointer(null);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    let cancelled = false;

    async function initTracking() {
      // Dynamically import MediaPipe from CDN (loaded via <script> tags in index.html)
      // eslint-disable-next-line no-undef
      const hands = new window.Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
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
          if (!cancelled) await hands.send({ image: videoRef.current });
        },
        width: 1280,
        height: 720,
      });

      handsRef.current = hands;
      cameraRef.current = camera;

      await camera.start();
      if (!cancelled) setIsReady(true);
    }

    initTracking().catch(console.error);

    return () => {
      cancelled = true;
      cameraRef.current?.stop();
      setIsReady(false);
    };
  }, [enabled, onResults]);

  return { videoRef, pointer, isReady };
}
