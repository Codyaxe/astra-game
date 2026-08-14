/**
 * LeaderboardScreen.jsx — Displays top players, highest retained scores,
 * attempt summary (out of 3), and QR ticket to retry or save.
 */

import { useEffect, useState } from 'react';
import { getLeaderboard, getTicketDownloadUrl } from '../services/api';

export default function LeaderboardScreen({ player, lastAttemptResult, onRetry, onReturnToTitle }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard(10)
      .then((res) => setLeaderboard(res.leaderboard || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const attemptsUsed = lastAttemptResult?.attempts_used || player?.total_attempts_used || 1;
  const attemptsRemaining = Math.max(0, 3 - attemptsUsed);
  const bestScore = lastAttemptResult?.best_score ?? player?.best_score ?? 0;

  return (
    <div className="screen screen--leaderboard">
      <div className="lb-container">
        <h1 className="lb-title">🏆 Astra Hall of Fame</h1>
        <p className="lb-subtitle">Rankings based on highest retained score</p>

        {player && (
          <div className="player-summary-card">
            <div className="player-summary-info">
              <h3>{player.first_name} {player.last_name} ({player.sr_code})</h3>
              <p>Course: <strong>{player.course}</strong></p>
              <p>Best Retained Score: <strong className="highlight-score">{bestScore}</strong></p>
              <p>Attempts Used: <strong>{attemptsUsed} / 3</strong> (Remaining: {attemptsRemaining})</p>
            </div>

            <div className="player-summary-qr">
              <img
                src={getTicketDownloadUrl(player.id)}
                alt="Your QR Ticket"
                className="ticket-thumb"
              />
              <span className="qr-hint">Your QR Ticket (Code: {player.qr_ticket_code})</span>
            </div>
          </div>
        )}

        <div className="lb-table-wrapper">
          {loading ? (
            <p className="lb-empty">Loading rankings…</p>
          ) : (
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>SR-Code</th>
                  <th>Course</th>
                  <th>Attempts</th>
                  <th>Highest Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, idx) => (
                  <tr key={row.player_id} className={row.player_id === player?.id ? 'active-row' : ''}>
                    <td className="rank-cell">#{idx + 1}</td>
                    <td>{row.first_name} {row.last_name}</td>
                    <td>{row.sr_code}</td>
                    <td>{row.course}</td>
                    <td>{row.attempts_used} / 3</td>
                    <td className="score-cell">{row.highest_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="lb-actions">
          {attemptsRemaining > 0 && onRetry && (
            <button className="btn-submit" onClick={onRetry}>
              🔄 Use Next Attempt ({attemptsRemaining} remaining)
            </button>
          )}
          <button className="btn-secondary" onClick={onReturnToTitle}>
            Back to Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}
