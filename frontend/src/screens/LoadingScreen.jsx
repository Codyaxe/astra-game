import React, { useEffect, useState } from 'react';
import HoloDeactivate from '../components/HoloDeactivate';

export default function LoadingScreen({
  message = 'CALCULATING HYPERSPACE JUMP VECTOR…',
  player = null,
  constellationName = 'ARIES (TUTORIAL)',
  onComplete = null,
  duration = 2400,
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  const pilotName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : 'CADET EXPLORER';
  const srCode = player?.sr_code ? `[${player.sr_code}]` : '';

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        setIsExiting(true);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div
      className="screen screen--loading"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(2, 6, 18, 0.4)',
        backdropFilter: 'blur(3px)',
        fontFamily: "'Outfit', 'Sora', sans-serif",
      }}
    >
      <HoloDeactivate isExiting={isExiting} onExitComplete={onComplete} style={{ width: 'min(480px, 90vw)' }}>
        <div
          style={{
            position: 'relative',
            background: 'rgba(4, 9, 24, 0.88)',
            border: '1.5px solid rgba(186, 230, 253, 0.55)',
            borderRadius: '24px',
            padding: '2.2rem 2.4rem',
            textAlign: 'center',
            boxShadow: '0 0 50px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.25), inset 0 0 25px rgba(186, 230, 253, 0.08)',
            backdropFilter: 'blur(16px)',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Tech Corner Ticks */}
          <div style={{ position: 'absolute', top: 10, left: 10, width: 10, height: 10, borderTop: '2px solid #BAE6FD', borderLeft: '2px solid #BAE6FD' }} />
          <div style={{ position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderTop: '2px solid #BAE6FD', borderRight: '2px solid #BAE6FD' }} />
          <div style={{ position: 'absolute', bottom: 10, left: 10, width: 10, height: 10, borderBottom: '2px solid #BAE6FD', borderLeft: '2px solid #BAE6FD' }} />
          <div style={{ position: 'absolute', bottom: 10, right: 10, width: 10, height: 10, borderBottom: '2px solid #BAE6FD', borderRight: '2px solid #BAE6FD' }} />

          {/* Top Status Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 10px #38BDF8' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#BAE6FD', letterSpacing: '2px', textTransform: 'uppercase', textShadow: '0 0 8px rgba(186, 230, 253, 0.6)' }}>
              NAV COMPUTER HYPERSPACE ENGAGED
            </span>
          </div>

          {/* Pilot Info Badge */}
          <div style={{ fontSize: '0.85rem', color: '#F8FAFC', fontWeight: 700, letterSpacing: '1px', marginBottom: '1.2rem' }}>
            👨‍🚀 {pilotName.toUpperCase()} <span style={{ color: '#7DD3FC' }}>{srCode}</span>
          </div>

          {/* Destination Target */}
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(224, 242, 254, 0.75)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            DESTINATION SECTOR
          </div>
          <h2
            style={{
              fontFamily: "'Sora', 'Outfit', sans-serif",
              fontSize: '1.7rem',
              color: '#FFFFFF',
              margin: '4px 0 1.4rem 0',
              fontWeight: 900,
              letterSpacing: '3px',
              textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 35px rgba(56, 189, 248, 0.6)',
            }}
          >
            {constellationName.toUpperCase()}
          </h2>

          {/* Hyperspace Warp Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid rgba(186, 230, 253, 0.35)',
              position: 'relative',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #38BDF8 0%, #BAE6FD 60%, #FFFFFF 100%)',
                boxShadow: '0 0 16px rgba(186, 230, 253, 0.9)',
                transition: 'width 0.05s linear',
              }}
            />
          </div>

          {/* Telemetry Message */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600, letterSpacing: '1px' }}>
            <span>{message}</span>
            <span style={{ color: '#E0F2FE', fontWeight: 800, textShadow: '0 0 6px rgba(224, 242, 254, 0.8)' }}>{progress}%</span>
          </div>
        </div>
      </HoloDeactivate>
    </div>
  );
}
