/**
 * TitleScreen.jsx — Master Astra Kiosk & Game Attract Hub
 */

import { useEffect, useRef } from 'react';
import astraIcon from '../assets/astraIcon.png';

const STAR_COUNT = 180;

export default function TitleScreen({
  onOpenScanner,
  onOpenRegister,
  onOpenLeaderboard,
  onOpenDashboard,
  onQuickPlay,
  onStart,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let stars = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.3,
        speed: Math.random() * 0.25 + 0.05,
        alpha: Math.random(),
      }));
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.alpha += (Math.random() - 0.5) * 0.02;
        s.alpha = Math.max(0.15, Math.min(1, s.alpha));
        s.y += s.speed;
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

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="screen screen--title" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas ref={canvasRef} className="title-canvas" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />
      
      {/* Top Bar for Admin & Leaderboard */}
      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 10, display: 'flex', gap: 12 }}>
        <button
          onClick={onOpenLeaderboard}
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(244, 213, 141, 0.4)',
            color: '#f4d58d',
            padding: '8px 16px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={onOpenDashboard}
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            color: '#818cf8',
            padding: '8px 16px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ⚙️ Admin
        </button>
      </div>

      <div className="title-content" style={{ position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={astraIcon} alt="Astra Developers" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <div style={{ fontSize: 13, fontWeight: 800, color: '#f4d58d', letterSpacing: 4, textTransform: 'uppercase' }}>
            ASTRA DEVELOPERS
          </div>
        </div>

        <h1 className="title-logo" style={{ fontSize: 'clamp(2.6rem, 6vw, 4.8rem)', fontWeight: 900, background: 'linear-gradient(135deg, #fff 0%, #f4d58d 60%, #e0a96d 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, letterSpacing: 3 }}>
          STAR LINK
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 16, margin: 0, letterSpacing: 1 }}>
          Interactive Constellation Tracing & Gesture Challenge
        </p>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20, width: '100%', maxWidth: 360, padding: '0 20px', boxSizing: 'border-box' }}>
          <button
            onClick={onOpenScanner || onStart}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 16,
              border: '1px solid rgba(244, 213, 141, 0.5)',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: 1.5,
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            📷 SCAN QR TICKET TO PLAY
          </button>

          <button
            onClick={onOpenRegister}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(15, 23, 42, 0.85)',
              color: '#f8fafc',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 1,
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            📝 REGISTER / SCAN ID CARD
          </button>

          <button
            onClick={onQuickPlay}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 12,
              border: '1px dashed rgba(244, 213, 141, 0.3)',
              background: 'transparent',
              color: '#f4d58d',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            ⚡ Quick Play (Guest Demo)
          </button>
        </div>
      </div>
    </div>
  );
}
