/**
 * ShipCockpitViewport.jsx — Full 360° First-Person Helmet & Visor Canopy Overlay
 * 
 * Layers at zIndex: 15 (above Canvas/Constellation/Cursor, below HUD/Timer at 20, Blink at 40, Score Overlay at 50).
 * Renders a complete solid flight helmet silhouette with unified celestial gold visor outline & micro-HUD accents.
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

  const padX = 16;
  const padY = 16;

  // Inner Helmet Visor Aperture Rim Path (Inset from screen boundaries so 0% gets cut off)
  const visorRimPath = `
    M 140,${padY}
    L ${w - 140},${padY}
    L ${w - 90},${padY + 32}
    L ${w - 32},${padY + 90}
    L ${w - padX},140
    L ${w - padX},${h - 140}
    L ${w - 32},${h - padY - 90}
    L ${w - 90},${h - padY - 32}
    L ${w - 140},${h - padY}
    L 140,${h - padY}
    L 90,${h - padY - 32}
    L 32,${h - padY - 90}
    L ${padX},${h - 140}
    L ${padX},140
    L 32,${padY + 90}
    L 90,${padY + 32}
    Z
  `;

  // Compound Path for Full Outer Helmet Solid Hull (Even-Odd Fill)
  const fullHelmetHullPath = `
    M 0,0
    L ${w},0
    L ${w},${h}
    L 0,${h}
    Z
    ${visorRimPath}
  `;

  return (
    <svg
      className="ship-cockpit-viewport"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 15,
        pointerEvents: 'none',
        animation: 'lowerHelmetVisor 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <defs>
        {/* Subtle Canopy Glass Reflection Gradient (Celestial Gold Theme) */}
        <linearGradient id="canopyGlare" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(244, 213, 141, 0.09)" />
          <stop offset="35%" stopColor="rgba(244, 213, 141, 0.04)" />
          <stop offset="100%" stopColor="rgba(3, 7, 18, 0)" />
        </linearGradient>

        {/* Metallic Helmet Bezel Glow Shadow */}
        <filter id="helmetGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#F4D58D" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* 1. Viewport Glass Reflection Glare */}
      <rect width="100%" height="100%" fill="url(#canopyGlare)" />

      {/* 2. Full Solid Helmet Hull Mask (Connects 360° around viewport with zero cut-off gaps) */}
      <path
        d={fullHelmetHullPath}
        fill="#050814"
        fillRule="evenodd"
        stroke="rgba(244, 213, 141, 0.35)"
        strokeWidth="1.5"
      />

      {/* 3. Glowing Inner Visor Rim Outline */}
      <path
        d={visorRimPath}
        fill="none"
        stroke="#F4D58D"
        strokeWidth="2.5"
        strokeLinejoin="round"
        filter="url(#helmetGlow)"
      />

      {/* 4. Top/Bottom Micro-HUD Bezel Accents */}
      {/* Top Center HUD Ticks */}
      <line x1={w / 2 - 40} y1={padY / 2} x2={w / 2 + 40} y2={padY / 2} stroke="#F4D58D" strokeWidth="2" strokeDasharray="6 4" />
      {/* Bottom Center HUD Ticks */}
      <line x1={w / 2 - 40} y1={h - padY / 2} x2={w / 2 + 40} y2={h - padY / 2} stroke="#F4D58D" strokeWidth="2" strokeDasharray="6 4" />

      {/* 5. 4-Corner Accent Micro-Brackets (All Gold) */}
      <path d={`M 90,${padY + 32} L 32,${padY + 90}`} stroke="#F4D58D" strokeWidth="3" strokeLinecap="round" />
      <path d={`M ${w - 90},${padY + 32} L ${w - 32},${padY + 90}`} stroke="#F4D58D" strokeWidth="3" strokeLinecap="round" />
      <path d={`M 90,${h - padY - 32} L 32,${h - padY - 90}`} stroke="#F4D58D" strokeWidth="3" strokeLinecap="round" />
      <path d={`M ${w - 90},${h - padY - 32} L ${w - 32},${h - padY - 90}`} stroke="#F4D58D" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
