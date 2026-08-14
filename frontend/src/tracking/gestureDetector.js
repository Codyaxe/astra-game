/**
 * gestureDetector.js — Mathematical and heuristics engine for wand motion gestures.
 *
 * Implements:
 * 1. Forward / Back Tilt  (pitch angle or z-depth differential)
 * 2. Left / Right Tilt    (roll angle or rapid horizontal delta)
 * 3. Circle Motion        (angular path accumulation -> force exit)
 * 4. Shake Up / Down      (high frequency vertical reversal -> recalibration)
 */

export class GestureDetector {
  constructor() {
    this.history = []; // [{ x, y, z, time, pitch, roll }]
    this.MAX_HISTORY = 30;
    this.baselineZ = null;
    this.calibrated = false;
  }

  recalibrate(samplePoint) {
    if (samplePoint) {
      this.baselineZ = samplePoint.z || 0;
    }
    this.history = [];
    this.calibrated = true;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length === 0) return null;

    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const indexMcp = landmarks[5];
    const middleMcp = landmarks[9];

    // Compute Pitch (Forward / Back tilt)
    // Forward tilt: tip moves closer to camera or downward relative to MCP in 3D
    const dz = indexTip.z - indexMcp.z;
    const dy = indexTip.y - indexMcp.y;
    const pitch = Math.atan2(dz, dy) * (180 / Math.PI);

    // Compute Roll (Left / Right tilt)
    const dx = middleMcp.x - indexMcp.x;
    const roll = Math.atan2(middleMcp.y - indexMcp.y, dx) * (180 / Math.PI);

    const now = Date.now();
    const point = {
      x: indexTip.x,
      y: indexTip.y,
      z: indexTip.z,
      pitch,
      roll,
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
      isLeftRightTilt: this._detectLeftRightTilt(),
      isCircleMotion: this._detectCircleMotion(),
      isShakeUpDown: this._detectShakeUpDown(),
    };
  }

  // ---- 1. Forward / Back Tilt ----
  _detectForwardTilt(point) {
    // Tilt forward threshold: pitch angle or negative z-depth dip
    const zDelta = (point.z - this.baselineZ);
    return point.pitch < -20 || zDelta < -0.04;
  }

  _detectNeutralTilt(point) {
    const zDelta = (point.z - this.baselineZ);
    return point.pitch >= -10 && zDelta >= -0.015;
  }

  // ---- 2. Left / Right Tilt (Reset current lines) ----
  _detectLeftRightTilt() {
    if (this.history.length < 5) return false;
    const recent = this.history[this.history.length - 1];
    return Math.abs(recent.roll) > 40;
  }

  // ---- 3. Circle Motion (Force Emergency Exit) ----
  _detectCircleMotion() {
    if (this.history.length < 18) return false;
    // Calculate total angular sweep around centroid
    let cx = 0, cy = 0;
    for (const p of this.history) {
      cx += p.x;
      cy += p.y;
    }
    cx /= this.history.length;
    cy /= this.history.length;

    let totalAngleChange = 0;
    let prevAngle = null;

    for (const p of this.history) {
      const angle = Math.atan2(p.y - cy, p.x - cx);
      if (prevAngle !== null) {
        let diff = angle - prevAngle;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        totalAngleChange += diff;
      }
      prevAngle = angle;
    }

    // A full circle is ~2*PI (6.28 rad)
    return Math.abs(totalAngleChange) > 5.2;
  }

  // ---- 4. Shake Up / Down (Recalibrate) ----
  _detectShakeUpDown() {
    if (this.history.length < 12) return false;
    let reversals = 0;
    let lastDirection = 0;

    for (let i = 1; i < this.history.length; i++) {
      const dy = this.history[i].y - this.history[i - 1].y;
      if (Math.abs(dy) > 0.02) {
        const dir = dy > 0 ? 1 : -1;
        if (lastDirection !== 0 && dir !== lastDirection) {
          reversals++;
        }
        lastDirection = dir;
      }
    }

    return reversals >= 3;
  }
}
