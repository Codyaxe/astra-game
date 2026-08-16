/**
 * useMouseWandAdapter.js — Modular Mouse-to-Wand Testing Adapter
 *
 * Standalone React hook for local mouse testing.
 * Normalizes mouse movements & click-drag into wand telemetry ({ x, y, isDrawing, state })
 * and collects real-time freehand trajectory sample points for jagged silver line drawing.
 *
 * ARCHITECTURE NOTE:
 *   This adapter is a PURE INPUT EMITTER. It does NOT decide if a connection is valid or not.
 *   It emits raw drag events via onDragComplete({ fromStarId, toStarId }).
 *   The LOGIC LAYER (ChallengeScreen, or in production: the backend via WebSocket) decides
 *   validity and emits isSnap=true/false back to the rendering layer.
 *
 * DECOUPLED DESIGN: Deleting or unhooking this file will NOT break any presentation components.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Helper to map raw star data coords [0-1] to cockpit safe area screen norm coords [0-1]
const getStarScreenNorm = (starX, starY) => {
  const marginX = 0.12;
  const marginY = 0.14;
  const safeW = 1.0 - marginX * 2;
  const safeH = 1.0 - marginY * 2;
  return {
    x: marginX + starX * safeW,
    y: marginY + starY * safeH,
  };
};

export default function useMouseWandAdapter({
  stars = [],
  enabled = true,
  onDragComplete = null, // ({ fromStarId, toStarId }) — raw drag event, logic layer decides validity
}) {
  const [wandPointer, setWandPointer] = useState({
    x: 0.5,
    y: 0.5,
    isDrawing: false,
    state: 'idle',
  });
  const [activeStarId, setActiveStarId] = useState(null);
  const [drawingPath, setDrawingPath] = useState([]);

  const isMouseDownRef = useRef(false);
  const activeStarRef = useRef(null);
  const pathRef = useRef([]);

  /**
   * Find the nearest star within a detection radius.
   * Compares pointer position against cockpit-mapped star screen coordinates.
   */
  const findNearestStar = useCallback(
    (normX, normY, radius = 0.08) => {
      let nearest = null;
      let minDistance = radius;

      stars.forEach((star) => {
        const starPos = getStarScreenNorm(star.x, star.y);
        const dx = starPos.x - normX;
        const dy = starPos.y - normY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = star;
        }
      });
      return nearest;
    },
    [stars]
  );

  // Threshold for mousedown origin detection — requires clicking directly on/near star node
  const findOriginStar = useCallback(
    (normX, normY) => findNearestStar(normX, normY, 0.045),
    [findNearestStar]
  );

  useEffect(() => {
    if (!enabled) return;

    function handleMouseMove(e) {
      const normX = e.clientX / window.innerWidth;
      const normY = e.clientY / window.innerHeight;

      if (isMouseDownRef.current) {
        // Player is actively drawing — record trajectory
        pathRef.current = [...pathRef.current, { x: normX, y: normY }];
        setDrawingPath([...pathRef.current]);
        setWandPointer({ x: normX, y: normY, isDrawing: true, state: 'drawing' });
      } else {
        // Player is hovering / idle
        const nearest = findNearestStar(normX, normY, 0.07);
        setActiveStarId(nearest ? nearest.id : null);
        activeStarRef.current = nearest;
        setWandPointer({
          x: normX,
          y: normY,
          isDrawing: false,
          state: nearest ? 'pointing' : 'idle',
        });
      }
    }

    function handleMouseDown(e) {
      const normX = e.clientX / window.innerWidth;
      const normY = e.clientY / window.innerHeight;
      // Must click directly on a star to anchor the draw — no phantom snapping
      const originStar = findOriginStar(normX, normY);

      console.log('👇 [MOUSE DOWN / CLICK]', {
        isCollided: !!originStar,
        starId: originStar ? originStar.id : 'NONE',
        starName: originStar ? (originStar.label || originStar.name || `Star #${originStar.id}`) : 'NONE (Free Draw)',
        normX: Number(normX.toFixed(4)),
        normY: Number(normY.toFixed(4)),
        pixelX: e.clientX,
        pixelY: e.clientY,
      });

      isMouseDownRef.current = true;

      if (originStar) {
        setActiveStarId(originStar.id);
        activeStarRef.current = originStar;
      } else {
        activeStarRef.current = null;
      }

      // Drawing path ALWAYS starts at exact cursor click location (no pre-snap line from star center)
      pathRef.current = [{ x: normX, y: normY }];

      setDrawingPath([...pathRef.current]);
      setWandPointer({ x: normX, y: normY, isDrawing: true, state: 'drawing' });
    }

    function handleMouseUp(e) {
      if (!isMouseDownRef.current) return;
      isMouseDownRef.current = false;

      const normX = e.clientX / window.innerWidth;
      const normY = e.clientY / window.innerHeight;

      // Generous radius for release detection — logic layer decides validity
      const targetStar = findNearestStar(normX, normY);
      const originStar = activeStarRef.current;

      console.log('👆 [MOUSE UP / UNCLICK]', {
        isCollidedTarget: !!targetStar,
        originStarName: originStar ? (originStar.label || originStar.name || `Star #${originStar.id}`) : 'NONE',
        targetStarName: targetStar ? (targetStar.label || targetStar.name || `Star #${targetStar.id}`) : 'NONE (Empty Space)',
        originStarId: originStar ? originStar.id : 'NONE',
        targetStarId: targetStar ? targetStar.id : 'NONE',
        normX: Number(normX.toFixed(4)),
        normY: Number(normY.toFixed(4)),
        pixelX: e.clientX,
        pixelY: e.clientY,
      });

      // Emit raw drag event — logic layer (ChallengeScreen / backend) decides if valid
      if (onDragComplete) {
        onDragComplete({
          fromStarId: originStar ? originStar.id : null,
          toStarId: targetStar && originStar && targetStar.id !== originStar.id
            ? targetStar.id
            : null,
        });
      }

      // Reset drawing state
      pathRef.current = [];
      setDrawingPath([]);
      setActiveStarId(null);
      activeStarRef.current = null;
      setWandPointer((prev) => ({ ...prev, isDrawing: false, state: 'idle' }));
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, stars, findNearestStar, findOriginStar, onDragComplete]);

  return {
    wandPointer,
    activeStarId,
    drawingPath,
    // NOTE: snapEffect is NOT returned here — it is owned by the logic layer (ChallengeScreen)
  };
}
