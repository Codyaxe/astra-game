/**
 * WandCursor.jsx — Renders the live wand cursor on screen
 * Receives normalized 0-1 coordinates streamed continuously via WebSocket
 */

import React from 'react';

export default function WandCursor({
  pointer = null, // { x: normX, y: normY, isDrawing: boolean }
  width = window.innerWidth,
  height = window.innerHeight,
}) {
  if (!pointer) return null;

  const px = pointer.x * width;
  const py = pointer.y * height;
  const isDrawing = pointer.isDrawing;

  return (
    <div
      className={`wand-cursor ${isDrawing ? 'is-drawing' : ''}`}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`,
        zIndex: 10,
        pointerEvents: 'none',
        transition: 'transform 0.05s linear',
      }}
    >
      {/* Outer Reticle Ring */}
      <div
        style={{
          width: isDrawing ? 36 : 28,
          height: isDrawing ? 36 : 28,
          borderRadius: '50%',
          border: `2px solid ${isDrawing ? '#F4D58D' : '#70A1FF'}`,
          boxShadow: `0 0 12px ${isDrawing ? 'rgba(244, 213, 141, 0.8)' : 'rgba(112, 161, 255, 0.6)'}`,
          transition: 'all 0.15s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Core Wand Spark */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 0 8px #FFFFFF',
          }}
        />
      </div>
    </div>
  );
}
