/**
 * TutorialBriefingModal.jsx — In-Game Navigation Briefing & Gesture Tutorial
 *
 * Appears at the start of stage 1 (or re-opened) before timer starts.
 * Features:
 * - Dynamic Nav Computer Navigation Telemetry & Holographic Starlight Simulation
 * - Real-time Voiceover & Subtitles with DIALOGUE_CONFIG (Phase A & B)
 * - Gesture Controls Breakdown (Mouse, Palm/Fist, Point Auto)
 * - Sleek "SKIP BRIEFING ⮞" button in the bottom right corner
 */

import { useState, useEffect } from 'react';
import HoloDeactivate from './HoloDeactivate';

export default function TutorialBriefingModal({
  player,
  constellationName = 'ORION',
  difficulty = 'easy',
  gestureStyle = 'point_auto',
  snappingMode = 'freeform',
  controlMode = 'hybrid',
  onStartGame,
}) {
  const [isExiting, setIsExiting] = useState(false);
  const pilotName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : 'CADET PILOT';

  function handleSkip() {
    if (isExiting) return;
    setIsExiting(true);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(10px)',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <HoloDeactivate isExiting={isExiting} onExitComplete={onStartGame} style={{ maxWidth: '680px', width: '100%' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(5, 8, 22, 0.98) 100%)',
            border: '1px solid rgba(244, 213, 141, 0.45)',
            borderRadius: '24px',
            padding: '2rem 2.4rem',
            boxShadow: '0 0 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(244, 213, 141, 0.15), inset 0 0 20px rgba(244, 213, 141, 0.05)',
            color: '#F1F0EC',
            fontFamily: "'Outfit', 'Segoe UI', system-ui, sans-serif",
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top Holographic Navigation Scanner Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#EF4444',
                  boxShadow: '0 0 10px #EF4444',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#F87171', letterSpacing: '2px', textTransform: 'uppercase' }}>
                ⚠️ NAV COMPUTER OFFLINE — MANUAL OVERRIDE
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#70A1FF', letterSpacing: '1px' }}>
              PILOT: {pilotName}
            </span>
          </div>

          {/* Title & Mission Directive */}
          <h1
            style={{
              fontFamily: "'Sora', 'Outfit', sans-serif",
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#F4D58D',
              margin: '0 0 0.5rem 0',
              letterSpacing: '1px',
              textShadow: '0 0 15px rgba(244, 213, 141, 0.4)',
            }}
          >
            CELESTIAL STAR TRACING BRIEFING
          </h1>

          <p style={{ fontSize: '0.92rem', color: '#CBD5E1', lineHeight: '1.5', margin: '0 0 1.4rem 0' }}>
            Our positioning sensors are fried. Trace the stellar pattern of <b>{constellationName.toUpperCase()}</b> by hand to calculate our emergency warp vector to the repair station!
          </p>

          {/* Interactive Control & Navigation Telemetry Box */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(112, 161, 255, 0.25)',
              borderRadius: '16px',
              padding: '1.2rem 1.4rem',
              marginBottom: '1.6rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
            }}
          >
            {/* Left: Tracing Rules */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#70A1FF', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                🌌 MISSION RULES
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#E2E8F0', lineHeight: '1.6' }}>
                <li>Connect all authentic constellation stars.</li>
                <li>
                  {difficulty === 'easy' ? (
                    <span style={{ color: '#4ADE80' }}>🟢 Easy: Guide lines ON & white dwarfs distinct.</span>
                  ) : difficulty === 'medium' ? (
                    <span style={{ color: '#FACC15' }}>🟡 Medium: Trap decoy stars active!</span>
                  ) : (
                    <span style={{ color: '#F87171' }}>🔴 Hard: 15s Timer & Decoy stars!</span>
                  )}
                </li>
                <li>Wrong traces will flash <b style={{ color: '#F87171' }}>RED</b>. Retrace to remove mistake.</li>
              </ul>
            </div>

            {/* Right: How to Control */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F4D58D', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                🎮 YOUR CONTROLS ({controlMode === 'mouse' ? 'MOUSE' : gestureStyle === 'fist_open' ? '✋ PALM / ✊ FIST' : '👉 POINT WAND'})
              </div>
              <div style={{ fontSize: '0.85rem', color: '#E2E8F0', lineHeight: '1.5' }}>
                {controlMode === 'mouse' ? (
                  <span>Click and drag between stars to connect or untrace lines.</span>
                ) : gestureStyle === 'fist_open' ? (
                  <span>
                    • <b>Open Palm ✋</b>: Locks star & traces starlight beam.<br />
                    • <b>Closed Fist ✊</b>: Pauses tracing & releases anchor.<br />
                    • <b>Freeform ✨</b>: Start from any star in any order!
                  </span>
                ) : (
                  <span>
                    • <b>Point Wand 👉</b>: Auto-traces starlight to your index finger.<br />
                    • <b>Sequential ⛓️</b>: Chains continuous path A ➔ B ➔ C.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Action Footer with Skip on Right */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              🎙️ <i>Listen to Ship AI transmission or skip anytime</i>
            </div>

            <button
              onClick={handleSkip}
              style={{
                background: 'linear-gradient(135deg, #F4D58D 0%, #E0A93B 100%)',
                color: '#0A0E1A',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 22px',
                fontSize: '0.9rem',
                fontWeight: 800,
                letterSpacing: '1px',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(244, 213, 141, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              START TRACING ⮞
            </button>
          </div>
        </div>
      </HoloDeactivate>
    </div>
  );
}
