/**
 * gestureDetector.js — Robust Angle-Independent Finger Detection
 *
 * Checks finger extension using distance from wrist landmark (works in any orientation).
 */

export class GestureDetector {
  constructor() {
    this.history = [];
    this.MAX_HISTORY = 20;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;

    const wrist = landmarks[0];

    // Helper: is finger extended outward from wrist?
    const isExtended = (tipIdx, pipIdx, mcpIdx) => {
      const tip = landmarks[tipIdx];
      const pip = landmarks[pipIdx];
      const mcp = landmarks[mcpIdx];

      const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      const dMcp = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);

      return dTip > dPip && dTip > dMcp;
    };

    const isIndexExtended = isExtended(8, 6, 5);
    const isMiddleExtended = isExtended(12, 10, 9);
    const isRingExtended = isExtended(16, 14, 13);
    const isPinkyExtended = isExtended(20, 18, 17);

    // 2 Fingers Up (✌️): Index + Middle extended, Ring + Pinky folded
    const isTwoFingersUp = isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended;

    // 3 Fingers Up (🤟): Index + Middle + Ring extended, Pinky folded
    const isThreeFingersUp = isIndexExtended && isMiddleExtended && isRingExtended && !isPinkyExtended;

    const indexTip = landmarks[8];
    const point = {
      x: indexTip.x,
      y: indexTip.y,
      z: indexTip.z,
      time: Date.now(),
    };

    return {
      point,
      isTwoFingersUp,
      isThreeFingersUp,
    };
  }
}
