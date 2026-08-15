/**
 * ConstellationLayer.jsx — Celestial Star Node & Connection Renderer
 * 
 * Supports 3D perspective arrival zoom (scale from center focal point)
 * and horizontal depth parallax turn shift.
 */

import React from 'react';

export default function ConstellationLayer({
  stars = [],
  connectedSegments = [], // Array of { from: starId, to: starId }
  wandPointer = null, // { x: normX, y: normY, isDrawing: bool }
  activeStarId = null,
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

  // Helper to convert normalized 0-1 coords to pixel coords with 3D scale expansion
  const toPx = (normX, normY) => {
    const targetX = normX * width;
    const targetY = normY * height;
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

  // Active star for live line drawing preview
  const activeStar = activeStarId ? starMap.get(activeStarId) : null;
  const wandPx = wandPointer ? toPx(wandPointer.x, wandPointer.y) : null;

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
        {/* Connection Line Glow Filter */}
        <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
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

      {/* 1. Backend Validated Snapped Connections */}
      {connectedSegments.map((segment, idx) => {
        const fromStar = starMap.get(segment.from);
        const toStar = starMap.get(segment.to);
        if (!fromStar || !toStar) return null;

        return (
          <g key={`conn-${idx}`}>
            {/* Outer Glow Line */}
            <line
              x1={fromStar.x}
              y1={fromStar.y}
              x2={toStar.x}
              y2={toStar.y}
              stroke="#F4D58D"
              strokeWidth="6"
              strokeOpacity="0.5"
              filter="url(#gold-glow)"
              strokeLinecap="round"
            />
            {/* Core Bright Line */}
            <line
              x1={fromStar.x}
              y1={fromStar.y}
              x2={toStar.x}
              y2={toStar.y}
              stroke="#F1F0EC"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* 2. Live Drawing Line (Active star to current Wand cursor) */}
      {wandPointer?.isDrawing && activeStar && wandPx && (
        <line
          x1={activeStar.x}
          y1={activeStar.y}
          x2={wandPx.x}
          y2={wandPx.y}
          stroke="#70A1FF"
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeOpacity="0.8"
        />
      )}

      {/* 3. Star Nodes */}
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

            {/* Label */}
            {star.label && scale > 0.6 && (
              <text
                y={22 * scale}
                textAnchor="middle"
                fill="#F1F0EC"
                fontSize={12 * Math.max(0.7, scale)}
                fontFamily="Outfit, sans-serif"
                letterSpacing="1px"
                style={{ textShadow: '0 0 6px rgba(0,0,0,0.8)' }}
              >
                {star.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
