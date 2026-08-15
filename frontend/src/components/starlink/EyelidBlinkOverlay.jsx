/**
 * EyelidBlinkOverlay.jsx — First-Person Anatomical Eye-Blink Component
 * 
 * Layers ABOVE the HUD & constellation (zIndex: 40), below ScoreOverlay (zIndex: 50).
 * Features curved anatomical eye shapes reaching 100% full closure BEFORE Game Over screen.
 */

import { useState, useEffect, useRef } from 'react';

export default function EyelidBlinkOverlay({
  active = false,
  duration = 2800, // 2.8s total timing
  onComplete = null,
}) {
  const [closure, setClosure] = useState(0); // 0 = open eyes, 1.0 = 100% full blackness closure
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setClosure(0);
      startTimeRef.current = null;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      return;
    }

    startTimeRef.current = Date.now();

    function updateBlink() {
      const elapsed = Date.now() - startTimeRef.current;

      if (elapsed < duration) {
        let currentClosure = 0;

        if (elapsed >= 300 && elapsed < 1000) {
          // Blink 1: Subtle initial flutter (300ms - 1000ms, max 65% close)
          const p = (elapsed - 300) / 700;
          currentClosure = Math.sin(p * Math.PI) * 0.65;
        } else if (elapsed >= 1100 && elapsed < 2500) {
          // Blink 2: Smooth heavy closure reaching 100% FULL BLACKNESS at 2500ms
          const p = (elapsed - 1100) / 1400;
          currentClosure = Math.min(1.0, Math.sin(p * (Math.PI / 2)));
        } else if (elapsed >= 2500) {
          // Hold 100% FULL CLOSURE until transition completes
          currentClosure = 1.0;
        }

        setClosure(currentClosure);
        animFrameRef.current = requestAnimationFrame(updateBlink);
      } else {
        setClosure(1.0); // 100% full closure reached before Score Overlay mounts
        onComplete?.();
      }
    }

    animFrameRef.current = requestAnimationFrame(updateBlink);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [active, duration, onComplete]);

  if (!active && closure === 0) return null;

  const h = window.innerHeight;
  const w = window.innerWidth;
  const midY = h / 2;

  // Anatomical Eye Curves (Upper & Lower Eyelids meeting at corners)
  // When closure = 0, eyelids are tucked away off-screen.
  // When closure = 1, top and bottom curved eyelids meet at midY (100% full closure).
  const topControlY = midY * closure + (1 - closure) * (-h * 0.3);
  const bottomControlY = midY * (2 - closure) + (1 - closure) * (h * 0.3);

  return (
    <svg
      className="eyelid-blink-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 40, // Above HUD & Constellation (20), below Score Overlay (50)
        pointerEvents: 'none',
      }}
    >
      {/* Upper Anatomical Eyelid */}
      <path
        d={`M 0,0 L ${w},0 L ${w},${midY * closure} Q ${w / 2},${topControlY + 45 * closure} 0,${midY * closure} Z`}
        fill="#030712"
      />

      {/* Lower Anatomical Eyelid */}
      <path
        d={`M 0,${h} L ${w},${h} L ${w},${h - midY * closure} Q ${w / 2},${bottomControlY - 45 * closure} 0,${h - midY * closure} Z`}
        fill="#030712"
      />
    </svg>
  );
}
