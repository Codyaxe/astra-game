/**
 * mockApi.js — Simulates HTTP round initialization fetch
 * Returns constellation star nodes in normalized 0-1 coordinates,
 * along with host-driven timer data (startTime & duration).
 */

export const MOCK_CONSTELLATION = {
  id: "cassiopeia_alpha",
  name: "Cassiopeia",
  // Normalized coordinates (0.0 to 1.0)
  stars: [
    { id: 1, label: "Alpha", x: 0.25, y: 0.35, isHead: true },
    { id: 2, label: "Beta", x: 0.40, y: 0.25 },
    { id: 3, label: "Gamma", x: 0.55, y: 0.45 },
    { id: 4, label: "Delta", x: 0.70, y: 0.30 },
    { id: 5, label: "Epsilon", x: 0.82, y: 0.55 },
  ],
  // Valid connection pairs (defined by backend game logic)
  connections: [
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
    { from: 4, to: 5 },
  ],
};

/**
 * Simulates one-time HTTP fetch for round init
 */
export async function fetchRoundInit() {
  // Simulate network latency (200ms)
  await new Promise((resolve) => setTimeout(resolve, 200));

  const now = Date.now();
  const durationSec = 45;

  return {
    success: true,
    roundId: "rnd_" + Math.random().toString(36).substring(2, 9),
    constellation: MOCK_CONSTELLATION,
    hostTimer: {
      startTime: now,
      duration: durationSec, // in seconds
    },
  };
}
