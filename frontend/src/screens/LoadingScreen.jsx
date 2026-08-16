import HoloDeactivate from '../components/HoloDeactivate';

export default function LoadingScreen({
  message = 'Warping to celestial coordinates…',
  player = null,
  constellationName = 'ORION',
  isExiting = false,
  onExitComplete = null,
}) {
  const pilotName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : 'PILOT 01';
  const srCode = player?.sr_code ? `(${player.sr_code})` : '';

  return (
    <div className="screen screen--loading" style={{ backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <HoloDeactivate isExiting={isExiting} onExitComplete={onExitComplete} style={{ minWidth: '380px' }}>
        <div
          className="loading-content"
          style={{
            background: 'rgba(5, 8, 20, 0.85)',
            border: '1px solid rgba(244, 213, 141, 0.35)',
            borderRadius: '16px',
            padding: '2.2rem 3rem',
            textAlign: 'center',
            boxShadow: '0 0 35px rgba(3, 7, 18, 0.9), inset 0 0 15px rgba(244, 213, 141, 0.1)',
            backdropFilter: 'blur(12px)',
            width: '100%',
          }}
        >
        {/* Pilot Badge Telemetry */}
        <div
          className="loading-pilot-badge"
          style={{
            fontSize: '0.8rem',
            color: '#70A1FF',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '0.5rem',
            fontWeight: 600,
          }}
        >
          👨‍🚀 {pilotName} {srCode}
        </div>

        {/* Target Constellation Destination */}
        <h2
          style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: '1.4rem',
            color: '#F4D58D',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '1.2rem',
            fontWeight: 700,
          }}
        >
          SYSTEM TARGET: {constellationName.toUpperCase()}
        </h2>

        {/* Glowing Warp Spinner */}
        <div className="loading-spinner" style={{ margin: '0 auto 1.2rem auto' }} />

        {/* Status Message */}
        <p className="loading-message" style={{ color: '#F1F0EC', fontSize: '0.95rem', letterSpacing: '1px' }}>
          {message}
        </p>

        {/* Hyperspace Warp Telemetry Bar */}
        <div
          style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            marginTop: '1.2rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #70A1FF, #F4D58D)',
              animation: 'pulse 1.8s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </HoloDeactivate>
  </div>
  );
}
