/**
 * LoadingScreen.jsx — Shown while fetching constellations / initialising camera.
 */

export default function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="screen screen--loading">
      <div className="loading-content">
        <div className="loading-spinner" />
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
}
