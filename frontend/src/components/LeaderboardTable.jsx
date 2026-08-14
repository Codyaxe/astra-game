/**
 * LeaderboardTable.jsx — Reusable ranked list of players.
 */

export default function LeaderboardTable({ entries = [] }) {
  if (entries.length === 0) {
    return <p className="lb-empty">No scores yet — be the first!</p>;
  }

  return (
    <ol className="lb-list">
      {entries.map((entry, i) => (
        <li key={entry.player_id ?? i} className="lb-row">
          <span className="lb-rank">{i + 1}</span>
          <span className="lb-name">{entry.full_name}</span>
          <span className="lb-course">{entry.course}</span>
          <span className="lb-score">{entry.total_score?.toFixed(1) ?? 0}</span>
        </li>
      ))}
    </ol>
  );
}
