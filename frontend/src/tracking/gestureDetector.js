/**
 * gestureDetector.js — Natural Wand & Hand Gesture Detector with Palm & Fist Support
 *
 * Tracks:
 * 1. Wand Pointer Coordinates (Index fingertip position { x, y, z })
 * 2. Closed Fist vs Open Palm recognition
 * 3. Forward Tilt / Pinch / Hover states
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

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexMcp = landmarks[5];
    const indexPip = landmarks[6];
    const indexTip = landmarks[8];
    const middlePip = landmarks[10];
    const middleTip = landmarks[12];
    const ringPip = landmarks[14];
    const ringTip = landmarks[16];
    const pinkyPip = landmarks[18];
    const pinkyTip = landmarks[20];

    // Compute Pitch Angle (Forward / Back tilt)
    const dz = indexTip.z - indexMcp.z;
    const dy = indexTip.y - indexMcp.y;
    const pitch = Math.atan2(dz, dy) * (180 / Math.PI);

    // Compute Pinch Distance (Index Tip <-> Thumb Tip)
    const pinchDx = indexTip.x - thumbTip.x;
    const pinchDy = indexTip.y - thumbTip.y;
    const pinchDz = indexTip.z - thumbTip.z;
    const pinchDist = Math.sqrt(pinchDx * pinchDx + pinchDy * pinchDy + pinchDz * pinchDz);

    // Distances from wrist to tips vs wrist to PIP joints
    const distToWrist = (p) => {
      const dx = p.x - wrist.x;
      const dy = p.y - wrist.y;
      const dz = (p.z || 0) - (wrist.z || 0);
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    // Strict per-finger curling checks relative to PIP/MCP joints & wrist
    const indexCurled = distToWrist(indexTip) < distToWrist(indexPip) * 1.02;
    const middleCurled = distToWrist(middleTip) < distToWrist(middlePip) * 1.02;
    const ringCurled = distToWrist(ringTip) < distToWrist(ringPip) * 1.02;
    const pinkyCurled = distToWrist(pinkyTip) < distToWrist(pinkyPip) * 1.02;

    const curledCount = (indexCurled ? 1 : 0) + (middleCurled ? 1 : 0) + (ringCurled ? 1 : 0) + (pinkyCurled ? 1 : 0);
    const extendedCount = 4 - curledCount;

    // TRUE Closed Fist: Index finger MUST be curled into palm, plus at least 2 other fingers
    const isFist = indexCurled && curledCount >= 3;

    // TRUE Open Palm: All or most fingers (including index) extended outwards
    const isOpenPalm = !indexCurled && extendedCount >= 3;

    const now = Date.now();
    const point = {
      x: indexTip.x,
      y: indexTip.y,
      z: indexTip.z,
      pitch,
      pinchDist,
      isFist,
      isOpenPalm,
      curledCount,
      extendedCount,
      time: now,
    };

    this.history.push(point);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    if (this.baselineZ === null) {
      this.baselineZ = indexTip.z;
    } else {
      this.baselineZ += (indexTip.z - this.baselineZ) * 0.02;
    }

    const isForwardTilt = this._detectForwardTilt(point);
    const isPinching = pinchDist < 0.065;
    const isDrawing = isForwardTilt || isPinching || isOpenPalm;

    return {
      point,
      isFist,
      isOpenPalm,
      isForwardTilt,
      isPinching,
      isDrawing,
      isNeutralTilt: this._detectNeutralTilt(point, isPinching),
    };
  }

  // ---- Forward Tilt or Pinch to Draw ----
  _detectForwardTilt(point) {
    const zDelta = (point.z - this.baselineZ);
    return point.pitch < -12 || zDelta < -0.025;
  }

  _detectNeutralTilt(point, isPinching) {
    const zDelta = (point.z - this.baselineZ);
    return !isPinching && (point.pitch >= -8 || zDelta >= -0.012);
  }
}
