/**
 * snapping.js — Cockpit Safe-Area Magnetic Snapping & Coordinate Alignment Algorithm
 */

export function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Helper to convert constellation star coordinates into Cockpit Aperture Screen coordinates (0..1)
 */
export function toScreenNorm(normX, normY) {
  const marginX = 0.12;
  const marginY = 0.14;
  const safeW = 1.0 - marginX * 2; // 0.76
  const safeH = 1.0 - marginY * 2; // 0.72
  return {
    x: marginX + normX * safeW,
    y: marginY + normY * safeH,
  };
}

/**
 * Finds the nearest star node within its extended hitbox radius.
 * If within range, returns the star and snaps coordinates to its center on screen.
 *
 * @param {{x: number, y: number}} pointer  (normalised 0..1)
 * @param {Array<StarNode|object>} starNodes
 * @returns {{ snapped: boolean, node: object|null, x: number, y: number }}
 */
export function getMagneticSnap(pointer, starNodes) {
  if (!pointer || !starNodes || starNodes.length === 0) {
    return { snapped: false, node: null, x: pointer?.x || 0, y: pointer?.y || 0 };
  }

  let nearestNode = null;
  let nearestScreenPos = null;
  let minDistance = Infinity;

  // Generous magnetic attraction hitbox radius (8.5% of screen width)
  const DEFAULT_HITBOX = 0.085;

  for (const node of starNodes) {
    // If node already has mapped screen coordinates, use them; otherwise map through cockpit safe margins
    const starScreen = (node.screenX !== undefined && node.screenY !== undefined)
      ? { x: node.screenX, y: node.screenY }
      : toScreenNorm(node.x, node.y);

    const d = calculateDistance(pointer.x, pointer.y, starScreen.x, starScreen.y);
    const hitbox = node.hitbox_radius || DEFAULT_HITBOX;

    if (d <= hitbox && d < minDistance) {
      minDistance = d;
      nearestNode = node;
      nearestScreenPos = starScreen;
    }
  }

  if (nearestNode && nearestScreenPos) {
    return {
      snapped: true,
      node: nearestNode,
      x: nearestScreenPos.x,
      y: nearestScreenPos.y,
    };
  }

  return {
    snapped: false,
    node: null,
    x: pointer.x,
    y: pointer.y,
  };
}
