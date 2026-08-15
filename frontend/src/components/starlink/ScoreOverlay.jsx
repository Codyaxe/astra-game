/**
 * ScoreOverlay.jsx — Post-Round Score Overlay Box Component
 * 
 * Decoupled React component mounting on top of the starfield background.
 * As requested, presents a styled box displaying the score and round outcome.
 */

import React from 'react';

export default function ScoreOverlay({
  score = 85,
  isWin = true,
  onRestart = null,
}) {
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
        backgroundColor: 'rgba(3, 7, 18, 0.4)',
        backdropFilter: 'blur(4px)',
        animation: 'scoreFadeIn 0.5s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes scoreFadeIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Styled Score Box */}
      <div
        className="score-box"
        style={{
          width: '360px',
          padding: '36px 28px',
          background: 'linear-gradient(145deg, #050814 0%, #0B132B 100%)',
          border: `2px solid ${isWin ? '#F4D58D' : '#E5484D'}`,
          borderRadius: '16px',
          boxShadow: `0 0 30px ${isWin ? 'rgba(244, 213, 141, 0.35)' : 'rgba(229, 72, 77, 0.35)'}`,
          textAlign: 'center',
          color: '#F1F0EC',
          fontFamily: "'Outfit', 'Inter', sans-serif",
        }}
      >
        <h2
          style={{
            margin: '0 0 8px 0',
            fontSize: '1.4rem',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: isWin ? '#F4D58D' : '#E5484D',
          }}
        >
          {isWin ? 'Navigation Complete' : 'Mission Failed'}
        </h2>

        <div
          style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: '#F1F0EC',
            margin: '16px 0',
            letterSpacing: '2px',
          }}
        >
          SCORE: {score}
        </div>

        <p
          style={{
            fontSize: '0.95rem',
            color: 'rgba(241, 240, 236, 0.75)',
            marginBottom: '28px',
          }}
        >
          {isWin
            ? 'Hyper-navigation successful! Constellation linked.'
            : 'Navigation disrupted. Spacecraft impact recorded.'}
        </p>

        {onRestart && (
          <button
            onClick={onRestart}
            style={{
              padding: '12px 28px',
              backgroundColor: isWin ? '#F4D58D' : '#E5484D',
              color: '#050814',
              border: 'none',
              borderRadius: '24px',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
              letterSpacing: '1px',
              transition: 'transform 0.2s ease, filter 0.2s ease',
            }}
            onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
          >
            RETURN TO BASE
          </button>
        )}
      </div>
    </div>
  );
}
