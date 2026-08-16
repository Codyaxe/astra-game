/**
 * HUD.jsx — Sleek Cockpit HUD Display (Upper-Left Constellation Name + Upper-Right Timer)
 */

export default function HUD({
  timeLeft = 30,
  constellationName = 'Orion (Demo)',
}) {
  const isTimeCritical = timeLeft <= 5;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <>
      {/* Upper-Left Constellation Target Badge */}
      <div
        className="hud-constellation-upper-left"
        style={{
          position: 'absolute',
          top: '24px',
          left: '28px',
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(5, 8, 20, 0.75)',
          border: '1.5px solid #F4D58D',
          boxShadow: '0 0 20px rgba(244, 213, 141, 0.35), inset 0 0 10px rgba(244, 213, 141, 0.15)',
          backdropFilter: 'blur(10px)',
          padding: '10px 22px',
          borderRadius: '24px',
          color: '#FFF8E7',
          fontFamily: "'Outfit', 'Sora', sans-serif",
          fontWeight: 800,
          fontSize: '0.95rem',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: '#F4D58D', fontSize: '0.9rem' }}>✦</span>
        <span>{constellationName || 'ORION'}</span>
      </div>

      {/* Upper-Right Timer HUD Pill */}
      <div
        className="hud-timer-upper-right"
        style={{
          position: 'absolute',
          top: '24px',
          right: '28px',
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(5, 8, 20, 0.75)',
          border: `1.5px solid ${isTimeCritical ? '#E5484D' : '#F4D58D'}`,
          boxShadow: `0 0 20px ${isTimeCritical ? 'rgba(229, 72, 77, 0.5)' : 'rgba(244, 213, 141, 0.35)'}, inset 0 0 10px rgba(244, 213, 141, 0.15)`,
          backdropFilter: 'blur(10px)',
          padding: '10px 22px',
          borderRadius: '24px',
          color: isTimeCritical ? '#E5484D' : '#F1F0EC',
          fontFamily: "'Outfit', 'Sora', sans-serif",
          fontWeight: 800,
          fontSize: '1.3rem',
          letterSpacing: '2px',
          userSelect: 'none',
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: '#F4D58D', textTransform: 'uppercase', letterSpacing: '2px' }}>
          ⏱ TIME
        </span>
        <span>{formatted}</span>
      </div>
    </>
  );
}
