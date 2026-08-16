/**
 * HoloDeactivate.jsx -- Reusable Holographic Deactivation Wrapper
 *
 * Wraps any overlay/screen and plays a 3-phase hologram power-off animation
 * when `isExiting` becomes true:
 *
 *   Phase 1 -- "Glitching"  (0ms   -> 350ms): RGB chromatic aberration + scan-line flicker
 *   Phase 2 -- "Collapsing" (350ms -> 650ms): content collapses vertically to a bright cyan line
 *   Phase 3 -- "Flash"      (650ms -> 850ms): that line pulses and fades out
 *   Done                    (850ms):           onExitComplete fires -> parent unmounts
 *
 * Usage:
 *   <HoloDeactivate isExiting={isExiting} onExitComplete={onExitComplete}>
 *     <YourOverlayContent />
 *   </HoloDeactivate>
 *
 * The parent is responsible for unmounting after onExitComplete fires.
 * HoloDeactivate renders null from "done" onward as a safety fallback.
 */

import { useEffect, useRef, useState } from 'react';

const PHASE_DURATIONS = {
  glitching:  350,
  collapsing: 300,
  flash:      200,
};

export default function HoloDeactivate({
  isExiting = false,
  onExitComplete,
  children,
  className = '',
  style = {},
}) {
  const [phase, setPhase] = useState('idle');
  const timersRef = useRef([]);

  useEffect(() => {
    if (!isExiting || phase !== 'idle') return;

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
      aria-hidden={phase !== 'idle' ? true : undefined}
    >
      {children}
      <div className="holo-deactivate__scanlines" aria-hidden="true" />
      {phase === 'flash' && (
        <div className="holo-deactivate__flash-bar" aria-hidden="true" />
      )}
    </div>
  );
}
