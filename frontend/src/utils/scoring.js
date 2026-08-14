/**
 * scoring.js — Client-side scoring helpers (mirrors backend logic for instant feedback).
 */

/**
 * Compute Euclidean distance between two points.
 */
export function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Check if a pointer position is within a node's hitbox.
 * @param {{x: number, y: number}} pointer  — normalised pointer coords
 * @param {{x: number, y: number}} node     — normalised node coords
 * @param {number} threshold                — normalised distance threshold
 * @returns {boolean}
 */
export function hitTest(pointer, node, threshold = 0.035) {
  return distance(pointer.x, pointer.y, node.x, node.y) <= threshold;
}

/**
 * Accumulate total wand travel distance from a list of pointer positions.
 * @param {{x: number, y: number}[]} points
 * @returns {number}
 */
export function totalTravelDistance(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
  }
  return total;
}

/**
 * Check whether two node IDs form a valid edge in the constellation.
 * @param {number} a        — node id
 * @param {number} b        — node id
 * @param {number[][]} edges — [[fromId, toId], ...]
 * @returns {boolean}
 */
export function isValidEdge(a, b, edges) {
  return edges.some(
    ([from, to]) => (from === a && to === b) || (from === b && to === a),
  );
}
