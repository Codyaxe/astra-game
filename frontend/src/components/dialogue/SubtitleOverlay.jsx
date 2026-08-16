/**
 * SubtitleOverlay.jsx — Cinematic Movie Subtitle Display
 *
 * Renders dialogue subtitles anchored at the bottom-center of the screen with:
 * - Deep dark translucent backdrop banner with rounded border
 * - Glowing cyan speaker label ("SHIP AI:")
 * - Crisp white, high-contrast typography (movie subtitle aesthetic)
 * - Smooth fade-in & fade-out transitions
 */

import React from 'react';

export default function SubtitleOverlay({ subtitle = null }) {
  if (!subtitle || !subtitle.text) return null;

  const { speaker = 'SHIP AI', text = '' } = subtitle;

  return (
    <div
      className="subtitle-overlay-container"
      style={{
        position: 'fixed',
        bottom: '36px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999, // Rendered on top of all screens, briefing codex, and HUD layers
        width: 'min(860px, 90vw)',
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'flex',
        justifyContent: 'center',
        animation: 'subtitleFadeIn 0.25s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes subtitleFadeIn {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      <div
        className="subtitle-banner"
        style={{
          background: 'rgba(3, 6, 16, 0.96)', // Solid crisp high-contrast background (no blur distortion)
          border: '1.5px solid rgba(0, 240, 255, 0.6)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0, 240, 255, 0.25)',
          borderRadius: '12px',
          padding: '14px 32px',
          color: '#FFFFFF',
          fontFamily: "'Outfit', 'Sora', sans-serif",
          fontSize: '1.2rem',
          fontWeight: 700,
          lineHeight: 1.45,
          letterSpacing: '0.5px',
          textAlign: 'center',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.95)',
        }}
      >
        <span
          style={{
            color: '#00F0FF',
            fontWeight: 800,
            letterSpacing: '1.5px',
            marginRight: '12px',
            textShadow: '0 0 12px rgba(0, 240, 255, 0.9)',
            textTransform: 'uppercase',
          }}
        >
          {speaker}:
        </span>
        <span>{text}</span>
      </div>
    </div>
  );
}
