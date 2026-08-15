/**
 * HUD.jsx — Heads-up display during gameplay.
 */

import { memo } from 'react';

function HUD({
  constellationName,
  timeLeft,
  attemptNumber = 1,
  maxAttempts = 3,
  wrongConnections = 0,
  clicks = 0,
  gestureStatus = 'Neutral',
  onDraw = false,
}) {
  const isTimeCritical = timeLeft <= 5;

  return (
    <div className="hud-container">
      <div className="hud-top">
        <div className="hud-left">
          <span className="hud-constellation">✦ {constellationName || 'Loading…'}</span>
          <span className="hud-attempt-badge">Attempt {attemptNumber} / {maxAttempts}</span>
        </div>

        <div className={`hud-timer ${isTimeCritical ? 'hud-timer--danger' : ''}`}>
          ⏱ {timeLeft}s
        </div>

        <div className="hud-stats">
          <span className="hud-stat">✕ Mistakes: {wrongConnections}</span>
          <span className="hud-stat">👆 Clicks: {clicks}</span>
        </div>
      </div>

      <div className="hud-gesture-bar">
        <span className={`gesture-pill ${onDraw ? 'gesture-pill--active' : ''}`}>
          {gestureStatus}
        </span>
        <div className="gesture-help">
          <span>Forward Tilt: <strong>Draw</strong></span>
          <span>Raise 2 Fingers: <strong>Reset Lines</strong></span>
          <span>Circle: <strong>Force Exit</strong></span>
          <span>Shake: <strong>Recalibrate</strong></span>
        </div>
      </div>
    </div>
  );
}

export default memo(HUD);
