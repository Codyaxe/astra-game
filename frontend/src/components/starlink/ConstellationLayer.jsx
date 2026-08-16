/**
 * ConstellationLayer.jsx — Celestial Star Node & Connection Renderer
 * 
 * Pure presentation component painting backend star positions, live silver freehand drawing,
 * celestial gold validated connections, and snapping morph animations. Zero star text labels.
 */

import React, { useEffect } from 'react';

export default function ConstellationLayer({
  stars = [],
  connectedSegments = [], // Array of { from: starId, to: starId }
  validGuideSegments = [], // Array of { from: starId, to: starId } (semi-transparent blue test guides)
  wandPointer = null, // { x: normX, y: normY, isDrawing: bool, state }
  activeStarId = null,
  drawingPath = [], // Freehand trajectory sample points [{x, y}, ...]
  snapEffect = null, // { success: bool, from, to, timestamp }
  width = window.innerWidth,
  height = window.innerHeight,
  opacity = 1,
  scale = 1, // 0.2 (far in 3D space) to 1.0 (arrived at destination)
  turnShift = 0, // Horizontal parallax turn shift
  winTurnX = 0, // Cinematic lower-right ship turn offset X
  winTurnY = 0, // Cinematic lower-right ship turn offset Y
}) {
  const cx = width / 2;
  const cy = height / 2;

  // Cockpit Safe Area Margins (12% X, 14% Y) to keep all stars & lines inside open cockpit window
  const marginX = width * 0.12;
  const marginY = height * 0.14;
  const safeW = width - marginX * 2;
  const safeH = height - marginY * 2;

  // Auto-detect backend virtual canvas resolution (e.g. 1920x1080, 3840x2160, or max star coordinate)
  const maxRawX = stars.length > 0 ? Math.max(1, ...stars.map((s) => s.x || 0)) : 1;
  const maxRawY = stars.length > 0 ? Math.max(1, ...stars.map((s) => s.y || 0)) : 1;
  const vWidth = maxRawX > 1.0 ? Math.max(1920, maxRawX) : 1.0;
  const vHeight = maxRawY > 1.0 ? Math.max(1080, maxRawY) : 1.0;

  // Helper to convert normalized 0-1 or backend virtual coords to cockpit safe aperture pixel coords
  const toPx = (normX, normY) => {
    // Auto-normalize against virtual canvas bounds and clamp to [0, 1]
    const rawNX = normX > 1.0 ? normX / vWidth : normX;
    const rawNY = normY > 1.0 ? normY / vHeight : normY;
    const nX = Math.min(1.0, Math.max(0, rawNX));
    const nY = Math.min(1.0, Math.max(0, rawNY));

    // Map normalized 0-1 into inner cockpit safe viewport [marginX, width - marginX]
    const targetX = marginX + nX * safeW;
    const targetY = marginY + nY * safeH;

    return {
      x: cx + (targetX - cx) * scale + turnShift + winTurnX,
      y: cy + (targetY - cy) * scale + winTurnY,
    };
  };

  // Map star IDs to pixel objects
  const starMap = new Map();
  stars.forEach((star) => {
    starMap.set(star.id, {
      ...star,
      ...toPx(star.x, star.y),
    });
  });

  // Log star positions once on mount for debugging and testing
  const hasLoggedRef = React.useRef(false);
  useEffect(() => {
    if (stars.length > 0 && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      console.log('⭐ [STARS MOUNT LOG]', stars.map((s) => {
        const px = toPx(s.x, s.y);
        return {
          id: s.id,
          label: s.label || `Star #${s.id}`,
          backendRawX: Number(s.x.toFixed(4)),
          backendRawY: Number(s.y.toFixed(4)),
          screenNormX: Number((px.x / width).toFixed(4)),
          screenNormY: Number((px.y / height).toFixed(4)),
          pixelX: Math.round(px.x),
          pixelY: Math.round(px.y),
        };
      }));
    }
  }, [stars, width, height]);

  // Active star for live line drawing preview
  const activeStar = activeStarId ? starMap.get(activeStarId) : null;
  const wandPx = wandPointer ? toPx(wandPointer.x, wandPointer.y) : null;

  // Format freehand silver drawing path into SVG points string
  const activePathPoints =
    drawingPath && drawingPath.length > 1
      ? drawingPath.map((pt) => {
          const px = toPx(pt.x, pt.y);
          return `${px.x},${px.y}`;
        }).join(' ')
      : null;

  // Check recent snap effect
  const isRecentSnap = snapEffect && Date.now() - (snapEffect.timestamp || 0) < 500;
  const snapFromStar = isRecentSnap && snapEffect.from ? starMap.get(snapEffect.from) : null;
  const snapToStar = isRecentSnap && snapEffect.to ? starMap.get(snapEffect.to) : null;

  return (
    <svg
      className="constellation-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        pointerEvents: 'none',
        opacity: opacity,
        transition: 'opacity 0.4s ease-out',
      }}
    >
      <defs>
        {/* Validated Gold Line Glow Filter */}
        <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Active Silver Live Line Glow Filter */}
        <filter id="silver-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Custom Celestial Star Glow Gradient */}
        <radialGradient id="star-aura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F4D58D" stopOpacity="1" />
          <stop offset="50%" stopColor="#F4D58D" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#F4D58D" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 0. Semi-Transparent Blue Guide Lines for Target Valid Connections */}
      {validGuideSegments.map((segment, idx) => {
        const fromStar = starMap.get(segment.from);
        const toStar = starMap.get(segment.to);
        if (!fromStar || !toStar) return null;

        return (
          <line
            key={`guide-${idx}`}
            x1={fromStar.x}
            y1={fromStar.y}
            x2={toStar.x}
            y2={toStar.y}
            stroke="rgba(112, 161, 255, 0.45)"
            strokeWidth="2"
            strokeDasharray="6 6"
            strokeLinecap="round"
          />
        );
      })}

      {/* 1. Permanent Validated Celestial Gold Connections */}
      {connectedSegments.map((segment, idx) => {
        const fromStar = starMap.get(segment.from);
        const toStar = starMap.get(segment.to);
        if (!fromStar || !toStar) return null;

        return (
          <g key={`conn-${idx}`}>
            {/* Outer Gold Glow Line */}
            <line
              x1={fromStar.x}
              y1={fromStar.y}
              x2={toStar.x}
              y2={toStar.y}
              stroke="#F4D58D"
              strokeWidth="6"
              strokeOpacity="0.65"
              filter="url(#gold-glow)"
              strokeLinecap="round"
            />
            {/* Core Bright Line */}
            <line
              x1={fromStar.x}
              y1={fromStar.y}
              x2={toStar.x}
              y2={toStar.y}
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* 2. Live Active Freehand Silver Line (Jagged / Irregular Player Trajectory) */}
      {wandPointer?.isDrawing && (() => {
        // Live drawing stays in raw pixel space to match the WandCursor reticle position exactly.
        // toPx is intentionally NOT applied here — stars use the cockpit safe area mapping,
        // but the drawing stroke follows the actual cursor, so raw coords are correct.
        const rawCursor = { x: wandPointer.x * width, y: wandPointer.y * height };

        const livePts = drawingPath.length > 0
          ? [...drawingPath.map((pt) => ({ x: pt.x * width, y: pt.y * height })), rawCursor]
          : [rawCursor];

        if (livePts.length < 2) return null;

        const livePoints = livePts.map((p) => `${p.x},${p.y}`).join(' ');

        return (
          <g className="live-silver-stroke">
            {/* Silver Glow Backdrop */}
            <polyline
              points={livePoints}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="5"
              strokeOpacity="0.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#silver-glow)"
            />
            {/* Silver Core Stroke */}
            <polyline
              points={livePoints}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })()}

      {/* 3. Snapping Transition Pulse (isSnap = true -> Gold Spark Pulse) */}
      {isRecentSnap && snapEffect.success && snapToStar && (
        <g transform={`translate(${snapToStar.x}, ${snapToStar.y})`}>
          <circle
            r="32"
            fill="none"
            stroke="#F4D58D"
            strokeWidth="3"
            style={{
              animation: 'snapSpark 0.45s ease-out forwards',
            }}
          />
          <style>{`
            @keyframes snapSpark {
              0% { transform: scale(0.3); opacity: 1; stroke-width: 5px; }
              100% { transform: scale(1.8); opacity: 0; stroke-width: 1px; }
            }
          `}</style>
        </g>
      )}

      {/* 4. Star Nodes with Star ID Labels */}
      {Array.from(starMap.values()).map((star) => {
        const isActive = star.id === activeStarId;
        const isConnected = connectedSegments.some(
          (s) => s.from === star.id || s.to === star.id
        );

        const nodeRadius = (isActive ? 28 : isConnected ? 22 : 16) * scale;
        const coreRadius = (isActive ? 5 : 3.5) * scale;

        return (
          <g key={`star-${star.id}`} transform={`translate(${star.x}, ${star.y})`}>
            {/* Outer Aura Glow */}
            <circle
              r={nodeRadius}
              fill="url(#star-aura)"
              className="star-node-aura"
            />

            {/* Diamond Starlight Asset */}
            <polygon
              points={`${0 * scale},${-10 * scale} ${3 * scale},${-3 * scale} ${10 * scale},${0 * scale} ${3 * scale},${3 * scale} ${0 * scale},${10 * scale} ${-3 * scale},${3 * scale} ${-10 * scale},${0 * scale} ${-3 * scale},${-3 * scale}`}
              fill={isConnected || isActive ? '#F4D58D' : '#F1F0EC'}
            />

            {/* Inner Core */}
            <circle r={coreRadius} fill="#FFFFFF" />

            {/* Star ID Badge Label */}
            <text
              y={nodeRadius + 15}
              textAnchor="middle"
              fill={isConnected || isActive ? '#F4D58D' : '#94A3B8'}
              fontSize="12"
              fontWeight="bold"
              fontFamily="sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              #{star.id} {star.label ? `(${star.label})` : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
