/**
 * MenuScreen.jsx — Main menu after the title / attract screen.
 *
 * Options: Play (→ registration), Leaderboard, Credits.
 */

export default function MenuScreen({ onPlay, onQuickPlay, onLeaderboard, onUnitTest }) {
  return (
    <div className="screen screen--menu">
      <div className="menu-card">
        <h2 className="menu-title">✦ Constellation Tracer</h2>

        <button className="menu-btn menu-btn--primary" onClick={onPlay}>
          🚀 Start Challenge (Registration)
        </button>

        <button className="menu-btn" style={{ borderColor: '#F4D58D', color: '#F4D58D' }} onClick={onQuickPlay}>
          ⭐ Quick Play Demo (No Backend)
        </button>

        <button className="menu-btn" onClick={onUnitTest}>
          🧪 Unit Test Harness
        </button>

        <button className="menu-btn" onClick={onLeaderboard}>
          🏆 Leaderboard
        </button>

        <button className="menu-btn" disabled>
          ℹ️ Credits
        </button>
      </div>
    </div>
  );
}
