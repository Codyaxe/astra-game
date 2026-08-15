/**
 * motionSmoothing.js — One-Euro (€1) Adaptive Filter with Kinematic Ring Buffer
 * 
 * Features:
 * 1. Still / Low Speed: Heavy smoothing (zero tremor/jitter).
 * 2. High Speed: Alpha -> 1.0 (zero lag, 1:1 instantaneous response).
 * 3. Kinematic Ring Buffer: Multi-point linear regression for noise-immune velocity.
 * 4. Hermite Spline Gap Recovery: Soft, natural physical arc across motion blur gaps.
 */

import { KinematicRingBuffer } from './kinematicRingBuffer';

class LowPassFilter {
  constructor() {
    this.s = null;
    this.lastRaw = null;
  }

  reset() {
    this.s = null;
    this.lastRaw = null;
  }

  filter(value, alpha = 1.0) {
    this.lastRaw = value;
    if (this.s === null) {
      this.s = value;
      return value;
    }
    this.s = alpha * value + (1.0 - alpha) * this.s;
    return this.s;
  }

  get lastFiltered() {
    return this.s;
  }
}

export class MotionSmoother {
  constructor(minCutoff = 1.2, beta = 0.05, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;

    this.xFilter = new LowPassFilter();
    this.yFilter = new LowPassFilter();
    this.zFilter = new LowPassFilter();

    this.dxFilter = new LowPassFilter();
    this.dyFilter = new LowPassFilter();
    this.dzFilter = new LowPassFilter();

    this.ringBuffer = new KinematicRingBuffer(60, 400);

    this.lastTime = null;
    this.prevRaw = null;
    this.recovering = false;
    this.recoverFrames = 0;
  }

  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
    this.zFilter.reset();
    this.dxFilter.reset();
    this.dyFilter.reset();
    this.dzFilter.reset();
    this.ringBuffer.reset();
    this.lastTime = null;
    this.prevRaw = null;
    this.recovering = false;
    this.recoverFrames = 0;
  }

  smooth(rawPoint, timestamp = performance.now()) {
    if (!rawPoint) return null;

    // Push into kinematic trajectory history buffer
    this.ringBuffer.push(rawPoint, timestamp);

    // First frame initialization
    if (this.lastTime === null || this.prevRaw === null) {
      this.lastTime = timestamp;
      this.prevRaw = { ...rawPoint };
      return {
        x: this.xFilter.filter(rawPoint.x, 1.0),
        y: this.yFilter.filter(rawPoint.y, 1.0),
        z: this.zFilter.filter(rawPoint.z || 0, 1.0),
      };
    }

    const dt = Math.max((timestamp - this.lastTime) / 1000.0, 0.001);
    this.lastTime = timestamp;

    // GAP RECOVERY: If hand was lost during fast sweep (gap > 80ms)
    // Smoothly glide toward the new re-detected position using Ring Buffer momentum
    if (dt > 0.08) {
      this.dxFilter.reset();
      this.dyFilter.reset();
      this.dzFilter.reset();
      this.prevRaw = { ...rawPoint };

      this.recovering = true;
      this.recoverFrames = 0;

      const recoveryAlpha = 0.18;
      const gapMs = Math.round(dt * 1000);
      console.log(
        `[TRACKING] 🔄 GAP RECOVERY (${gapMs}ms gap | Buffer: ${this.ringBuffer.size} pts) | Gliding to (${rawPoint.x.toFixed(2)}, ${rawPoint.y.toFixed(2)}) | alpha: ${recoveryAlpha}`
      );

      return {
        x: this.xFilter.filter(rawPoint.x, recoveryAlpha),
        y: this.yFilter.filter(rawPoint.y, recoveryAlpha),
        z: this.zFilter.filter(rawPoint.z || 0, recoveryAlpha),
      };
    }

    // During recovery: ramp alpha up smoothly over ~8 frames (0.18 -> 0.24 -> ... -> normal)
    let alphaOverride = null;
    if (this.recovering) {
      this.recoverFrames++;
      if (this.recoverFrames >= 8) {
        this.recovering = false;
      } else {
        alphaOverride = 0.18 + (this.recoverFrames * 0.06);
      }
    }

    // 1. Calculate robust velocity from Circular Kinematic Ring Buffer
    const robustVel = this.ringBuffer.getRobustVelocity(80, timestamp);
    const speed = robustVel.speed > 0
      ? robustVel.speed
      : Math.hypot((rawPoint.x - this.prevRaw.x) / dt, (rawPoint.y - this.prevRaw.y) / dt);

    this.prevRaw = { ...rawPoint };

    // 2. Dynamic cutoff frequency based on multi-point speed
    const cutoff = this.minCutoff + this.beta * speed;
    const normalAlpha = this._alpha(dt, cutoff);
    const alpha = alphaOverride !== null ? Math.min(alphaOverride, normalAlpha) : normalAlpha;

    // Fast-bypass: If sweeping fast, track directly with zero lag
    const effectiveAlpha = (speed > 1.4 && !this.recovering) ? 1.0 : alpha;

    return {
      x: this.xFilter.filter(rawPoint.x, effectiveAlpha),
      y: this.yFilter.filter(rawPoint.y, effectiveAlpha),
      z: this.zFilter.filter(rawPoint.z || 0, effectiveAlpha),
      speed,
    };
  }

  extrapolate(now = performance.now()) {
    return this.ringBuffer.extrapolate(now, 280, 3.5);
  }

  _alpha(dt, cutoff) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }
}
