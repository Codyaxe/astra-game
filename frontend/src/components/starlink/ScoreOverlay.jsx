/**
 * ScoreOverlay.jsx — Pure Transparent Hologram HUD Post-Round Score Overlay
 * 
 * True sci-fi 3D hologram HUD card with a fully transparent glass backdrop, 
 * vibrant glowing neon borders, horizontal holographic scanlines, and laser starlight typography.
 */

import React from 'react';
import HoloDeactivate from '../HoloDeactivate';

export default function ScoreOverlay({
  score = 85,
  isWin = true,
  player = null,
  telemetry = null,
  rankPlacement = 1,
  remainingAttempts = 2,
  continueLabel = null,
  onTryAgain = null,
  onContinue = null,
  onRestart = null,
  isExiting = false,
  onExitComplete = null,
}) {
  // Format Player Name: "DELA CRUZ, JUAN K." or fallback
  const rawFirstName = player?.first_name || 'JUAN';
  const rawLastName = player?.last_name || 'DELA CRUZ';
  const playerName = `${rawLastName.toUpperCase()}, ${rawFirstName.toUpperCase()} K.`;
  const courseText = player?.course ? `CICS - ${player.course}` : 'CICS - Computer Science';

  // Telemetry Defaults: Time (25.2s), Errors (8), Distance (30.2cm)
  const timeSpentSec = telemetry?.time_spent_sec !== undefined ? telemetry.time_spent_sec : 25.2;
  const wrongAttempts = telemetry?.wrong_attempts !== undefined ? telemetry.wrong_attempts : 8;
  const travelDistCm = telemetry?.travel_dist_cm !== undefined ? telemetry.travel_dist_cm : 30.2;

  // Primary Theme Color: Elegant Soft Celestial Gold for Win (#E2C98A), Softer Coral Rose for Fail (#F87171)
  const themeColor = isWin ? '#E2C98A' : '#F87171';
  const glowColor = isWin ? 'rgba(226, 201, 138, 0.45)' : 'rgba(248, 113, 113, 0.45)';
  const bgGlowColor = isWin ? 'rgba(226, 201, 138, 0.10)' : 'rgba(248, 113, 113, 0.10)';

  return (
    <div
      className="score-overlay-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(3, 7, 18, 0.25)',
        backdropFilter: 'blur(3px)',
        animation: 'holoFadeIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <style>{`
        @keyframes holoFadeIn {
          from { opacity: 0; transform: scale(0.88) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes holoFlicker {
          0%, 100% { box-shadow: 0 0 35px ${glowColor}, inset 0 0 20px ${bgGlowColor}; }
          50% { box-shadow: 0 0 55px ${glowColor}, inset 0 0 30px ${bgGlowColor}; }
        }
        .holo-scanlines {
          background: linear-gradient(
            to bottom,
            rgba(255,255,255,0),
            rgba(255,255,255,0) 50%,
            rgba(0,0,0,0.2) 50%,
            rgba(0,0,0,0.2)
          );
          background-size: 100% 4px;
        }
      `}</style>

      {/* Pure Transparent 3D Sci-Fi Hologram Card (Scoped HoloDeactivate Wrapper) */}
      <HoloDeactivate
        isExiting={isExiting}
        onExitComplete={onExitComplete}
        style={{ width: 'min(440px, 90vw)' }}
      >
        <div
          className="score-box holo-scanlines"
          style={{
            position: 'relative',
            width: '100%',
            padding: '36px 32px 32px 32px',
            background: 'rgba(5, 9, 22, 0.22)',
            border: `2px solid ${themeColor}`,
            borderRadius: '28px',
            boxShadow: `0 0 40px ${glowColor}, inset 0 0 25px ${bgGlowColor}`,
            animation: 'holoFlicker 3s ease-in-out infinite',
            textAlign: 'center',
            color: '#FFF8E7',
            fontFamily: "'Outfit', 'Sora', sans-serif",
            backdropFilter: 'blur(8px)',
            overflow: 'hidden',
          }}
        >
        {/* Hologram Corner Tech Ticks */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', width: '12px', height: '12px', borderTop: `2px solid ${themeColor}`, borderLeft: `2px solid ${themeColor}` }} />
        <div style={{ position: 'absolute', top: '12px', right: '12px', width: '12px', height: '12px', borderTop: `2px solid ${themeColor}`, borderRight: `2px solid ${themeColor}` }} />
        <div style={{ position: 'absolute', bottom: '12px', left: '12px', width: '12px', height: '12px', borderBottom: `2px solid ${themeColor}`, borderLeft: `2px solid ${themeColor}` }} />
        <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '12px', height: '12px', borderBottom: `2px solid ${themeColor}`, borderRight: `2px solid ${themeColor}` }} />

        {/* Top Centered Outcome Header Title */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              padding: '6px 18px',
              borderRadius: '20px',
              border: `1.5px solid ${themeColor}`,
              background: 'rgba(5, 9, 22, 0.4)',
              color: themeColor,
              fontSize: '0.85rem',
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              boxShadow: `0 0 14px ${glowColor}`,
              textShadow: `0 0 8px ${themeColor}`,
            }}
          >
            {isWin ? 'Navigation Complete' : 'Mission Failed'}
          </div>
        </div>

        {/* Hero Center Circular Profile Avatar (Hologram Ring) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div
            style={{
              position: 'relative',
              width: '105px',
              height: '105px',
              borderRadius: '50%',
              border: `2.5px solid ${themeColor}`,
              boxShadow: `0 0 30px ${glowColor}, inset 0 0 15px ${bgGlowColor}`,
              padding: '4px',
              background: 'rgba(5, 9, 22, 0.4)',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {player?.avatarUrl ? (
                <img src={player.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width="55" height="55" viewBox="0 0 24 24" fill={themeColor}>
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Player Name & Subtitle */}
        <h2
          style={{
            margin: '0 0 4px 0',
            fontSize: '1.4rem',
            fontWeight: 800,
            letterSpacing: '1px',
            color: '#FFFFFF',
            textShadow: `0 0 14px ${glowColor}`,
          }}
        >
          {playerName}
        </h2>
        <div
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: themeColor,
            letterSpacing: '1px',
            marginBottom: '24px',
            textShadow: `0 0 8px ${themeColor}`,
          }}
        >
          {courseText}
        </div>

        {/* Holographic Telemetry 3-Column Grid */}
        <div
          style={{
            borderTop: `1.5px solid ${themeColor}`,
            borderBottom: `1.5px solid ${themeColor}`,
            boxShadow: `0 0 15px ${glowColor}`,
            padding: '16px 0',
            marginBottom: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          {/* Time Stat */}
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: themeColor, textShadow: `0 0 10px ${themeColor}` }}>
              {timeSpentSec}s
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255, 248, 231, 0.8)', letterSpacing: '1px', marginTop: '2px' }}>
              TIME
            </div>
          </div>

          {/* Completion Stat */}
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38BDF8', textShadow: '0 0 10px #38BDF8' }}>
              {isWin ? '100%' : 'PARTIAL'}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255, 248, 231, 0.8)', letterSpacing: '1px', marginTop: '2px' }}>
              STATUS
            </div>
          </div>

          {/* Travel Distance Stat */}
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: themeColor, textShadow: `0 0 10px ${themeColor}` }}>
              {travelDistCm}cm
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255, 248, 231, 0.8)', letterSpacing: '1px', marginTop: '2px' }}>
              DISTANCE
            </div>
          </div>
        </div>

        {/* Score & Outcome Rank Banner */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: themeColor, letterSpacing: '2px', marginBottom: '6px', textShadow: `0 0 10px ${themeColor}` }}>
            SCORE: {typeof score === 'number' ? `${score}%` : score}
          </div>
          <div style={{ fontSize: '1.05rem', color: '#E2E8F0', fontWeight: 600 }}>
            {isWin ? (
              <>
                congratulations, you are now{' '}
                <span style={{ color: themeColor, fontWeight: 900, textShadow: `0 0 10px ${themeColor}` }}>
                  {rankPlacement ? `TOP ${rankPlacement}` : 'TOP'}
                </span>{' '}
                in the GAME
              </>
            ) : (
              <span style={{ color: '#FF3B30', textShadow: '0 0 10px #FF3B30' }}>
                Navigation disrupted. Spacecraft impact recorded.
              </span>
            )}
          </div>
        </div>

        {/* Dual Holographic Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          {/* Button 1: TRY AGAIN (if attempts remain) */}
          {remainingAttempts > 0 && (onTryAgain || onRestart) && (
            <button
              onClick={onTryAgain || onRestart}
              style={{
                width: '100%',
                padding: '13px 24px',
                backgroundColor: themeColor,
                color: '#050916',
                border: `2px solid ${themeColor}`,
                borderRadius: '30px',
                fontWeight: 900,
                fontSize: '0.92rem',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: `0 0 25px ${glowColor}`,
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              TRY AGAIN ({remainingAttempts} {remainingAttempts === 1 ? 'ATTEMPT' : 'ATTEMPTS'} LEFT)
            </button>
          )}

          {/* Button 2: CONTINUE / RETURN TO BASE */}
          {(onContinue || onRestart) && (
            <button
              onClick={() => {
                console.log('%c[ASTRA DIAGNOSTIC] 🖱️ ScoreOverlay Button 2 Clicked!', 'color: #38bdf8; font-weight: bold;', {
                  isWin,
                  continueLabel,
                  hasOnContinue: !!onContinue,
                  hasOnRestart: !!onRestart,
                });
                if (onContinue) onContinue();
                else if (onRestart) onRestart();
              }}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: 'rgba(5, 9, 22, 0.4)',
                color: themeColor,
                border: `1.5px solid ${themeColor}`,
                borderRadius: '30px',
                fontWeight: 800,
                fontSize: '0.9rem',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: `0 0 15px ${glowColor}, inset 0 0 10px ${bgGlowColor}`,
                textShadow: `0 0 8px ${themeColor}`,
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = themeColor;
                e.currentTarget.style.color = '#050916';
                e.currentTarget.style.textShadow = 'none';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(5, 9, 22, 0.4)';
                e.currentTarget.style.color = themeColor;
                e.currentTarget.style.textShadow = `0 0 8px ${themeColor}`;
              }}
            >
              {continueLabel || (onRestart ? 'RETURN TO BASE' : (isWin ? 'NEXT CONSTELLATION ⮞' : 'VIEW LEADERBOARD 🏆'))}
            </button>
          )}
        </div>
      </div>
      </HoloDeactivate>
    </div>
  );
}
