/**
 * snapping.js — Extended hitbox collision and magnetic snapping algorithm.
 */

export function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Finds the nearest star node within its extended hitbox radius.
 * If within range, returns the star and snaps coordinates to its center.
 *
 * @param {{x: number, y: number}} pointer  (normalised 0..1)
 * @param {Array<StarNode|object>} starNodes
 * @returns {{ snapped: boolean, node: object|null, x: number, y: number }}
 */
export function getMagneticSnap(pointer, starNodes) {
  if (!pointer || !starNodes) {
    return { snapped: false, node: null, x: pointer?.x || 0, y: pointer?.y || 0 };
  }

  let nearestNode = null;
  let minDistance = Infinity;

  for (const node of starNodes) {
    const d = calculateDistance(pointer.x, pointer.y, node.x, node.y);
    const hitbox = node.hitbox_radius || 0.055; // extended interactive zone

    if (d <= hitbox && d < minDistance) {
      minDistance = d;
      nearestNode = node;
    }
  }

  if (nearestNode) {
    return {
      snapped: true,
      node: nearestNode,
      x: nearestNode.x,
      y: nearestNode.y,
    };
  }

  return {
    snapped: false,
    node: null,
    x: pointer.x,
    y: pointer.y,
  };
}
