/**
 * gestureDetector.js — High-Precision Natural Wand & Hand Gesture Detector
 *
 * Tracks:
 * 1. Wand Pointer Coordinates (Index fingertip position { x, y, z })
 * 2. Forward Tilt (Wand Pitch forward) OR Pinch / Tap Gesture (Index + Thumb) to draw lines
 * 3. Neutral Untilt / Release to snap and complete connections
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
    const thumbTip = landmarks[4];

    // Compute Pitch Angle (Forward / Back tilt)
    const dz = indexTip.z - indexMcp.z;
    const dy = indexTip.y - indexMcp.y;
    const pitch = Math.atan2(dz, dy) * (180 / Math.PI);

    // Compute Pinch Distance (Index Tip <-> Thumb Tip)
    const pinchDx = indexTip.x - thumbTip.x;
    const pinchDy = indexTip.y - thumbTip.y;
    const pinchDz = indexTip.z - thumbTip.z;
    const pinchDist = Math.sqrt(pinchDx * pinchDx + pinchDy * pinchDy + pinchDz * pinchDz);

    const now = Date.now();
    const point = {
      x: indexTip.x,
      y: indexTip.y,
      z: indexTip.z,
      pitch,
      pinchDist,
      time: now,
    };

    this.history.push(point);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    if (this.baselineZ === null) {
      this.baselineZ = indexTip.z;
    } else {
      // Smoothly drift baseline Z to adapt to user posture shifts
      this.baselineZ += (indexTip.z - this.baselineZ) * 0.02;
    }

    const isForwardTilt = this._detectForwardTilt(point);
    const isPinching = pinchDist < 0.065;
    const isDrawing = isForwardTilt || isPinching;

    return {
      point,
      isForwardTilt,
      isPinching,
      isDrawing,
      isNeutralTilt: this._detectNeutralTilt(point, isPinching),
    };
  }

  // ---- Forward Tilt or Pinch to Draw ----
  _detectForwardTilt(point) {
    const zDelta = (point.z - this.baselineZ);
    // Forward tilt threshold: pitch < -12 deg or moved forward by > 0.025 in normalized Z
    return point.pitch < -12 || zDelta < -0.025;
  }

  _detectNeutralTilt(point, isPinching) {
    const zDelta = (point.z - this.baselineZ);
    // Neutral release threshold: untilted pitch >= -8 deg and not pinching
    return !isPinching && (point.pitch >= -8 || zDelta >= -0.012);
  }
}
