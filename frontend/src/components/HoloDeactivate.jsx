/**
 * HoloDeactivate.jsx -- Reusable Holographic Projection Container
 *
 * Project-In (Mounting):
 *   Starts as a central cyan laser line, unfolds vertically with RGB glitch bloom, and locks crisp.
 *
 * Power-Off (Exiting):
 *   Glitching (350ms) -> Vertical Collapse (300ms) -> Cyan Flash Snap (200ms) -> onExitComplete().
 */

import { useEffect, useRef, useState } from 'react';

const PHASE_DURATIONS = {
  projecting: 550,
  glitching:  350,
  collapsing: 300,
  flash:      200,
};

export default function HoloDeactivate({
  isExiting = false,
  animateEntry = true,
  onExitComplete,
  children,
  className = '',
  style = {},
}) {
  const [phase, setPhase] = useState(() => (animateEntry ? 'projecting' : 'idle'));
  const timersRef = useRef([]);

  // Handle Project-In (Mounting) transition
  useEffect(() => {
    if (!animateEntry || phase !== 'projecting') return;

    const timer = setTimeout(() => {
      setPhase('idle');
    }, PHASE_DURATIONS.projecting);

    return () => clearTimeout(timer);
  }, [animateEntry]);

  // Handle Power-Off (Exit) transition
  useEffect(() => {
    if (!isExiting || (phase !== 'idle' && phase !== 'projecting')) return;

    const clear = () => timersRef.current.forEach(clearTimeout);
    clear();

    timersRef.current = [
      setTimeout(() => setPhase('glitching'),  0),
      setTimeout(() => setPhase('collapsing'), PHASE_DURATIONS.glitching),
      setTimeout(() => setPhase('flash'),      PHASE_DURATIONS.glitching + PHASE_DURATIONS.collapsing),
      setTimeout(() => {
        setPhase('done');
        onExitComplete?.();
      }, PHASE_DURATIONS.glitching + PHASE_DURATIONS.collapsing + PHASE_DURATIONS.flash),
    ];

    return clear;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExiting]);

  if (phase === 'done') return null;

  return (
    <div
      className={`holo-deactivate holo-deactivate--${phase} ${className}`}
      style={style}
      aria-hidden={phase === 'done' || phase === 'flash' ? true : undefined}
    >
      {children}
      <div className="holo-deactivate__scanlines" style={{ pointerEvents: 'none' }} aria-hidden="true" />
      {phase === 'flash' && (
        <div className="holo-deactivate__flash-bar" style={{ pointerEvents: 'none' }} aria-hidden="true" />
      )}
    </div>
  );
}
