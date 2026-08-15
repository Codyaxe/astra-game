/**
 * ShipCockpitViewport.jsx — Constant First-Person Spaceship Canopy Overlay
 * 
 * Layers at zIndex: 15 (above Canvas/Constellation/Cursor, below HUD/Timer at 20, Blink at 40, Score Overlay at 50).
 * Simulates a futuristic spaceship glass canopy with unified celestial gold chamfered hull bezels across all 4 viewport corners.
 */

import { useState, useEffect } from 'react';

export default function ShipCockpitViewport() {
  const [size, setSize] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1920,
    h: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    function handleResize() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { w, h } = size;

  return (
    <svg
      className="ship-cockpit-viewport"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 15, // Above canvas & cursor (10), below HUD (20), Blink (40), Score Overlay (50)
        pointerEvents: 'none',
      }}
    >
      <defs>
        {/* Subtle Canopy Glass Reflection Gradient */}
        <linearGradient id="canopyGlare" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(244, 213, 141, 0.08)" />
          <stop offset="35%" stopColor="rgba(112, 161, 255, 0.03)" />
          <stop offset="100%" stopColor="rgba(3, 7, 18, 0)" />
        </linearGradient>

        {/* Outer Hull Frame Shadow */}
        <filter id="frameShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#030712" floodOpacity="0.9" />
        </filter>
      </defs>

      {/* 1. Subtle Viewport Glass Glare */}
      <rect width="100%" height="100%" fill="url(#canopyGlare)" />

      {/* 2. Top-Left Canopy Chamfered Corner */}
      <path
        d="M 0,0 L 140,0 L 90,32 L 32,90 L 0,140 Z"
        fill="#050814"
        stroke="rgba(244, 213, 141, 0.4)"
        strokeWidth="1.5"
        filter="url(#frameShadow)"
      />
      {/* Accent Micro Line Top-Left */}
      <path d="M 90,32 L 32,90" stroke="#F4D58D" strokeWidth="2.5" strokeLinecap="round" />

      {/* 3. Top-Right Canopy Chamfered Corner */}
      <path
        d={`M ${w},0 L ${w - 140},0 L ${w - 90},32 L ${w - 32},90 L ${w},140 Z`}
        fill="#050814"
        stroke="rgba(244, 213, 141, 0.4)"
        strokeWidth="1.5"
        filter="url(#frameShadow)"
      />
      {/* Accent Micro Line Top-Right */}
      <path d={`M ${w - 90},32 L ${w - 32},90`} stroke="#F4D58D" strokeWidth="2.5" strokeLinecap="round" />

      {/* 4. Bottom-Left Canopy Chamfered Corner */}
      <path
        d={`M 0,${h} L 140,${h} L 90,${h - 32} L 32,${h - 90} L 0,${h - 140} Z`}
        fill="#050814"
        stroke="rgba(244, 213, 141, 0.4)"
        strokeWidth="1.5"
        filter="url(#frameShadow)"
      />
      {/* Accent Micro Line Bottom-Left */}
      <path d={`M 90,${h - 32} L 32,${h - 90}`} stroke="#F4D58D" strokeWidth="2.5" strokeLinecap="round" />

      {/* 5. Bottom-Right Canopy Chamfered Corner */}
      <path
        d={`M ${w},${h} L ${w - 140},${h} L ${w - 90},${h - 32} L ${w - 32},${h - 90} L ${w},${h - 140} Z`}
        fill="#050814"
        stroke="rgba(244, 213, 141, 0.4)"
        strokeWidth="1.5"
        filter="url(#frameShadow)"
      />
      {/* Accent Micro Line Bottom-Right */}
      <path d={`M ${w - 90},${h - 32} L ${w - 32},${h - 90}`} stroke="#F4D58D" strokeWidth="2.5" strokeLinecap="round" />

      {/* 6. Outer Canopy Perimeter Bezel */}
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="none"
        stroke="rgba(244, 213, 141, 0.15)"
        strokeWidth="6"
      />
    </svg>
  );
}
