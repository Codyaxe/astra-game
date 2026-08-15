/**
 * GameReadyScreen.jsx — Shown after QR2 scan redirect.
 * Displays player name + "Tap anywhere to begin" then runs a 3-2-1-GO! countdown.
 */

import { useState, useEffect, useRef } from 'react';

const STAR_COUNT = 180;

function StarCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let stars = [];

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x:     Math.random() * canvas.width,
        y:     Math.random() * canvas.height,
        r:     Math.random() * 1.6 + 0.3,
        speed: Math.random() * 0.2 + 0.05,
        alpha: Math.random(),
      }));
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.alpha += (Math.random() - 0.5) * 0.02;
        s.alpha  = Math.max(0.1, Math.min(1, s.alpha));
        s.y     += s.speed;
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
        ctx.fillStyle = `rgba(240, 230, 140, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    }

    resize();
    animate();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }} />;
}

export default function GameReadyScreen({ player, onStart }) {
  // phase: 'ready' | 'countdown'
  const [phase, setPhase]       = useState('ready');
  const [countdown, setCountdown] = useState(3);

  function handleTap() {
    if (phase !== 'ready') return;
    setPhase('countdown');
  }

  // Run countdown when phase switches to 'countdown'
  useEffect(() => {
    if (phase !== 'countdown') return;

    let current = 3;
    setCountdown(current);

    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
      } else {
        clearInterval(interval);
        // "GO!" flash then start
        setCountdown('GO!');
        setTimeout(onStart, 600);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, onStart]);

  const firstName  = player?.first_name || player?.firstName || 'Player';
  const lastName   = player?.last_name || player?.lastName || '';
  const mi         = player?.mi || '';
  const fullName   = `${firstName}${mi ? ' ' + mi + '.' : ''} ${lastName}`;

  return (
    <div
      className="screen screen--game-ready"
      onClick={handleTap}
      style={{ cursor: phase === 'ready' ? 'pointer' : 'default' }}
    >
      <StarCanvas />

      {phase === 'ready' && (
        <div className="game-ready-content">
          <p className="game-ready-welcome">Welcome,</p>
          <h1 className="game-ready-name">✦ {firstName} ✦</h1>
          
          <div className="game-ready-details-card" onClick={(e) => e.stopPropagation()}>
            <div className="details-header">REGISTRATION RECORD</div>
            <div className="details-grid">
              <div className="details-item">
                <span className="details-label">Name:</span>
                <span className="details-val">{fullName}</span>
              </div>
              <div className="details-item">
                <span className="details-label">SR-Code:</span>
                <span className="details-val">{player?.sr_code || player?.srCode}</span>
              </div>
              <div className="details-item">
                <span className="details-label">Course:</span>
                <span className="details-val">{player?.course}</span>
              </div>
              {player?.department && (
                <div className="details-item">
                  <span className="details-label">Department:</span>
                  <span className="details-val">{player.department}</span>
                </div>
              )}
              {player?.year_level && (
                <div className="details-item">
                  <span className="details-label">Year & Section:</span>
                  <span className="details-val">Year {player.year_level} - {player.section || 'N/A'}</span>
                </div>
              )}
            </div>
          </div>

          <p className="game-ready-sub">
            Attempt {player ? (3 - (player.total_attempts_used ?? 0)) : 1} of 3
          </p>
          
          <div className="game-ready-cta-wrap">
            <p className="game-ready-cta">Tap anywhere to begin</p>
          </div>

          <button
            className="game-ready-back-btn"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = window.location.protocol + '//' + window.location.host + window.location.pathname;
            }}
          >
            Not you? Scan / Register Another
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="game-countdown-wrap" key={countdown}>
          <span className="game-countdown-number">{countdown}</span>
        </div>
      )}
    </div>
  );
}
