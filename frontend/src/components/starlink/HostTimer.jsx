/**
 * HostTimer.jsx — Host-Synchronized Round Timer
 * 
 * Derives time remaining directly from host parameters:
 * remaining = duration - (now - startTime) / 1000
 * Does NOT use an independent unanchored setInterval.
 */

import { useState, useEffect } from 'react';

export default function HostTimer({
  startTime = null, // epoch ms from host
  duration = 45,    // duration in seconds from host
  onExpire = null,
}) {
  const [remainingSec, setRemainingSec] = useState(() => {
    if (!startTime) return duration;
    const elapsedSec = (Date.now() - startTime) / 1000;
    return Math.max(0, Math.ceil(duration - elapsedSec));
  });

  useEffect(() => {
    if (!startTime) return;

    let animFrame;

    function updateTimer() {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const left = Math.max(0, Math.ceil(duration - elapsedSec));
      
      setRemainingSec(left);

      if (left <= 0) {
        onExpire?.();
      } else {
        animFrame = requestAnimationFrame(updateTimer);
      }
    }

    animFrame = requestAnimationFrame(updateTimer);

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [startTime, duration, onExpire]);

  // Format as MM:SS
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const isLowTime = remainingSec <= 10;

  return (
    <div
      className={`host-timer ${isLowTime ? 'is-low-time' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(5, 8, 20, 0.75)',
        border: `1px solid ${isLowTime ? '#E5484D' : '#F4D58D'}`,
        boxShadow: `0 0 12px ${isLowTime ? 'rgba(229, 72, 77, 0.4)' : 'rgba(244, 213, 141, 0.3)'}`,
        backdropFilter: 'blur(8px)',
        padding: '8px 18px',
        borderRadius: '24px',
        color: isLowTime ? '#E5484D' : '#F1F0EC',
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 'bold',
        fontSize: '1.25rem',
        letterSpacing: '1.5px',
        transition: 'all 0.3s ease',
      }}
    >
      <span style={{ fontSize: '0.9rem', color: '#F4D58D', textTransform: 'uppercase' }}>Time</span>
      <span>{formatted}</span>
    </div>
  );
}
