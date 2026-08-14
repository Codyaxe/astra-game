/**
 * TitleScreen.jsx — Idle / attract screen.
 *
 * Animated star-field background + game logo.
 * Tapping or any interaction transitions to the Menu screen.
 * Auto-returns here when no player activity is detected.
 */

import { useEffect, useRef } from 'react';

const STAR_COUNT = 220;

export default function TitleScreen({ onStart }) {
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
    <div className="screen screen--title" onClick={onStart}>
      <canvas ref={canvasRef} className="title-canvas" />
      <div className="title-content">
        {/* TODO: replace with <img src={ASSETS.images.logo} /> */}
        <h1 className="title-logo">✦ Constellation Tracer</h1>
        <p className="title-cta">Tap anywhere to begin</p>
      </div>
    </div>
  );
}
