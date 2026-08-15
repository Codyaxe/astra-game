/**
 * LeaderboardScreen.jsx — Displays top players, highest retained scores,
 * attempt summary (out of 3), and QR ticket to retry or save.
 */

import { useEffect, useState } from 'react';
import { getLeaderboard, getTicketDownloadUrl } from '../services/api';

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_CLASSES = ['lb-podium-card--gold', 'lb-podium-card--silver', 'lb-podium-card--bronze'];

const PAGE_SIZE = 5;

export default function LeaderboardScreen({ player, lastAttemptResult, onRetry, onReturnToTitle }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    getLeaderboard(50)
      .then((res) => setLeaderboard(res.leaderboard || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [player?.id, lastAttemptResult?.attempts_used]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const currentPlayerRow = leaderboard.find(
    (row) => row.player_id === player?.id
  );

  const attemptsUsed =
    currentPlayerRow?.attempts_used ??
    lastAttemptResult?.attempts_used ??
    player?.total_attempts_used ??
    0;

  const attemptsRemaining = Math.max(0, 3 - attemptsUsed);

  const bestScore =
    currentPlayerRow?.highest_score ??
    lastAttemptResult?.best_score ??
    player?.best_score ??
    0;

  // Derived stats
  const totalParticipants = leaderboard.length;
  const yourRank = currentPlayerRow
    ? leaderboard.findIndex((r) => r.player_id === player?.id) + 1
    : null;

  // Top 3 and the rest
  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // Filtered rest based on search
  const query = searchQuery.trim().toLowerCase();
  const filteredRest = query
    ? rest.filter((row) => {
      const name = `${row.first_name} ${row.last_name}`.toLowerCase();
      const sr = (row.sr_code || '').toLowerCase();
      const course = (row.course || '').toLowerCase();
      return name.includes(query) || sr.includes(query) || course.includes(query);
    })
    : rest;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRest.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedRest = filteredRest.slice(pageStart, pageStart + PAGE_SIZE);

  // Max score for progress bar scaling
  const maxScore = leaderboard.length > 0
    ? Math.max(...leaderboard.map((r) => r.highest_score || 0))
    : 100;

  const attemptFillClass =
    attemptsRemaining === 0 ? 'lb-attempts-fill--full' :
      attemptsRemaining === 1 ? 'lb-attempts-fill--warn' :
        'lb-attempts-fill--ok';

  return (
    <div className="screen screen--leaderboard">
      <div className="lb-container">
        {/* Header */}
        <div className="lb-header">
          <h1 className="lb-title">
            <span className="lb-title-icon">🏆</span>
            Astra Hall of Fame
          </h1>
          <p className="lb-subtitle">Rankings based on highest retained score</p>
        </div>

        {/* Player Summary */}
        {player && (
          <div className="player-summary-card">
            <div className="player-summary-info">
              <h3>{player.first_name} {player.last_name}</h3>
              <div className="player-summary-detail">
                SR-Code: <strong>{player.sr_code}</strong>
              </div>
              <div className="player-summary-detail">
                Course: <strong>{player.course}</strong>
              </div>

              <div className="lb-attempts">
                <div className="lb-attempts-bar">
                  <div
                    className={`lb-attempts-fill ${attemptFillClass}`}
                    style={{ width: `${(attemptsUsed / 3) * 100}%` }}
                  />
                </div>
                <span className="lb-attempts-text">
                  {attemptsUsed} / 3 attempts{attemptsRemaining > 0 && ` · ${attemptsRemaining} left`}
                </span>
              </div>
            </div>

            <div className="player-score-display">
              <span className="player-score-value">{bestScore}</span>
              <span className="player-score-label">Your Best</span>
            </div>

            <div className="player-summary-qr">
              <img
                src={getTicketDownloadUrl(player.id)}
                alt="Your QR Ticket"
                className="ticket-thumb"
              />
              <span className="qr-hint">{player.qr_ticket_code}</span>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="lb-stats-bar">
          <div className="lb-stat-card lb-stat-card--accent">
            <div className="lb-stat-value">{totalParticipants}</div>
            <div className="lb-stat-label">Total Participants</div>
          </div>
          <div className="lb-stat-card lb-stat-card--gold">
            <div className="lb-stat-value">{yourRank ? `#${yourRank}` : '—'}</div>
            <div className="lb-stat-label">Your Rank</div>
          </div>
          <div className="lb-stat-card lb-stat-card--green">
            <div className="lb-stat-value">{bestScore}</div>
            <div className="lb-stat-label">Your Best Score</div>
          </div>
        </div>

        {/* Podium — Top 3 */}
        {podium.length > 0 && (
          <div className="lb-podium-section">
            <div className="lb-podium">
              {/* Render order: 2nd, 1st, 3rd for visual podium effect */}
              {[podium[1], podium[0], podium[2]].filter(Boolean).map((row) => {
                const originalIdx = leaderboard.indexOf(row);
                const isYou = row.player_id === player?.id;
                return (
                  <div key={row.player_id} className={`lb-podium-card ${PODIUM_CLASSES[originalIdx]}`}>
                    {originalIdx === 0 && <span className="lb-podium-crown">👑</span>}
                    <div className="lb-podium-medal">{MEDALS[originalIdx]}</div>
                    <div className="lb-podium-name">
                      {row.first_name} {row.last_name}
                    </div>
                    <div className="lb-podium-course">{row.course}</div>
                    <div className="lb-podium-score">{row.highest_score}</div>
                    <div className="lb-podium-pts">points</div>
                    {isYou && <span className="lb-podium-you-tag">You</span>}
                  </div>
                );
              })}
            </div>
            {/* Podium platform base */}
            <div className="lb-podium-platform">
              <div className="lb-podium-base lb-podium-base--silver" />
              <div className="lb-podium-base lb-podium-base--gold" />
              <div className="lb-podium-base lb-podium-base--bronze" />
            </div>
          </div>
        )}

        {/* Table — Ranks 4+ */}
        <div>
          {(rest.length > 0 || loading) && (
            <div className="lb-table-toolbar">
              <div className="lb-table-section-header">
                <span className="lb-table-section-title">
                  {query ? 'Search Results' : 'All Rankings'}
                </span>
                <div className="lb-table-section-line" />
              </div>
              {rest.length > 0 && (
                <div className="lb-search">
                  <span className="lb-search-icon">🔍</span>
                  <input
                    type="text"
                    className="lb-search-input"
                    placeholder="Search name, SR-code…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <div className="lb-table-wrapper">
            {loading ? (
              <p className="lb-empty">Loading rankings…</p>
            ) : rest.length === 0 && podium.length === 0 ? (
              <p className="lb-empty">No rankings yet. Be the first!</p>
            ) : rest.length === 0 ? (
              <p className="lb-empty">Only {podium.length} player{podium.length !== 1 ? 's' : ''} on the board.</p>
            ) : (
              <>
                {query && (
                  <div className="lb-search-count" style={{ padding: '0.5rem 1rem 5px' }}>
                    {filteredRest.length} of {rest.length} players matching "{searchQuery}"
                  </div>
                )}
                <table className="lb-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Course</th>
                      <th>Score</th>
                      <th>Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRest.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="lb-empty" style={{ padding: '2rem' }}>
                          {query ? `No players found matching "${searchQuery}"` : 'No more players.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRest.map((row) => {
                        const rank = leaderboard.indexOf(row) + 1;
                        const isYou = row.player_id === player?.id;
                        const scorePercent = maxScore > 0 ? ((row.highest_score || 0) / maxScore) * 100 : 0;

                        return (
                          <tr key={row.player_id} className={isYou ? 'active-row' : ''}>
                            <td className="lb-rank">#{rank}</td>
                            <td>
                              <span className="lb-player-name">
                                {row.first_name} {row.last_name}
                              </span>
                              <span className="lb-player-meta"> · {row.sr_code}</span>
                            </td>
                            <td className="lb-player-meta">{row.course}</td>
                            <td className="lb-score-cell">
                              <div className="lb-score-inner">
                                <span className="lb-score-value">{row.highest_score}</span>
                                <div className="lb-score-bar">
                                  <div
                                    className="lb-score-bar-fill"
                                    style={{ width: `${scorePercent}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="lb-attempts-cell">
                              {row.attempts_used} / 3
                              {isYou && <span className="lb-active-badge">You</span>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="lb-pagination">
                    <button
                      className="lb-page-btn"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      ← Prev
                    </button>
                    <div className="lb-page-numbers">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => {
                          if (totalPages <= 7) return true;
                          if (p === 1 || p === totalPages) return true;
                          if (Math.abs(p - safeCurrentPage) <= 1) return true;
                          return false;
                        })
                        .reduce((acc, p, i, arr) => {
                          if (i > 0 && p - arr[i - 1] > 1) {
                            acc.push('...');
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === '...' ? (
                            <span key={`dots-${i}`} className="lb-page-dots">…</span>
                          ) : (
                            <button
                              key={p}
                              className={`lb-page-num ${p === safeCurrentPage ? 'lb-page-num--active' : ''}`}
                              onClick={() => setCurrentPage(p)}
                            >
                              {p}
                            </button>
                          )
                        )}
                    </div>
                    <button
                      className="lb-page-btn"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Actions */}
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
