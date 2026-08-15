/**
 * mediaPipeService.js — Singleton MediaPipe Manager
 *
 * Pre-warms the MediaPipe AI model in the background on app boot so there is
 * ZERO download or initialization freeze when entering the Challenge screen.
 * Configured with modelComplexity: 0 for ultra-fast, smooth performance on laptops.
 */

let sharedHands = null;
let isModelLoaded = false;

export function prewarmMediaPipe() {
  if (sharedHands || typeof window === 'undefined' || !window.Hands) return;

  try {
    sharedHands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    sharedHands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0, // 0 = Lite (3x faster, lightweight on laptops)
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });

    // Dummy warmup call so wasm/assets compile in background
    sharedHands.initialize().then(() => {
      isModelLoaded = true;
    }).catch(() => {});
  } catch (err) {
    console.warn('MediaPipe background warmup:', err);
  }
}

export function getSharedHands() {
  if (!sharedHands && typeof window !== 'undefined' && window.Hands) {
    prewarmMediaPipe();
  }
  return sharedHands;
}

export function isHandsLoaded() {
  return isModelLoaded;
}
