/**
 * gestureDetector.js — Simplified & Robust Wand Tracking
 *
 * Exclusively tracks:
 * 1. Wand Pointer Coordinates (Index fingertip position { x, y, z })
 * 2. Forward / Neutral Tilt (for deliberate drawing and clicking)
 *
 * All phantom gestures (Shake recalibration, Tilt reset, Circle exit) are disabled
 * to prevent accidental resets and interruptions during gameplay.
 */

export class GestureDetector {
  constructor() {
    this.history = [];
    this.MAX_HISTORY = 20;
    this.baselineZ = null;
  }

  recalibrate(samplePoint) {
    if (samplePoint) {
      this.baselineZ = samplePoint.z || 0;
    }
    this.history = [];
  }

  update(landmarks) {
    if (!landmarks || landmarks.length === 0) return null;

    const indexTip = landmarks[8];
    const indexMcp = landmarks[5];

    // Compute Pitch (Forward / Back tilt)
    const dz = indexTip.z - indexMcp.z;
    const dy = indexTip.y - indexMcp.y;
    const pitch = Math.atan2(dz, dy) * (180 / Math.PI);

    const now = Date.now();
    const point = {
      x: indexTip.x,
      y: indexTip.y,
      z: indexTip.z,
      pitch,
      time: now,
    };

    this.history.push(point);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    if (this.baselineZ === null) {
      this.baselineZ = indexTip.z;
    }

    return {
      point,
      isForwardTilt: this._detectForwardTilt(point),
      isNeutralTilt: this._detectNeutralTilt(point),
    };
  }

  // ---- Forward / Back Tilt ----
  _detectForwardTilt(point) {
    const zDelta = (point.z - this.baselineZ);
    return point.pitch < -20 || zDelta < -0.04;
  }

  _detectNeutralTilt(point) {
    const zDelta = (point.z - this.baselineZ);
    return point.pitch >= -10 && zDelta >= -0.015;
  }
}
