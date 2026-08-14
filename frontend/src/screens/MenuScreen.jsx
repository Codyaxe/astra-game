/**
 * MenuScreen.jsx — Main menu after the title / attract screen.
 *
 * Options: Play (→ registration), Leaderboard, Credits.
 */

export default function MenuScreen({ onPlay, onLeaderboard }) {
  return (
    <div className="screen screen--menu">
      <div className="menu-card">
        <h2 className="menu-title">✦ Constellation Tracer</h2>

        <button className="menu-btn menu-btn--primary" onClick={onPlay}>
          🚀 Play
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
