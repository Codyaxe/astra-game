/**
 * motionSmoothing.js — One-Euro (€1) Adaptive Filter with Smooth Gap Recovery
 * 
 * Features:
 * 1. Still / Low Speed: Heavy smoothing (zero tremor/jitter).
 * 2. High Speed: Alpha -> 1.0 (zero lag, 1:1 instantaneous response).
 * 3. Gap Recovery: When tracking resumes after motion blur, smoothly glides 
 *    from previous position to new position instead of teleporting.
 */

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
    this.lastTime = null;
    this.prevRaw = null;
    this.recovering = false;
    this.recoverFrames = 0;
  }

  smooth(rawPoint, timestamp = performance.now()) {
    if (!rawPoint) return null;

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
    // Don't teleport! Smoothly glide toward the new re-detected position.
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
        `[TRACKING] 🔄 GAP RECOVERY (${gapMs}ms gap) | Gliding to (${rawPoint.x.toFixed(2)}, ${rawPoint.y.toFixed(2)}) | alpha: ${recoveryAlpha}`
      );

      return {
        x: this.xFilter.filter(rawPoint.x, recoveryAlpha),
        y: this.yFilter.filter(rawPoint.y, recoveryAlpha),
        z: this.zFilter.filter(rawPoint.z || 0, recoveryAlpha),
      };
    }

    // During recovery: ramp alpha up smoothly over ~8 frames (0.18 -> 0.23 -> ... -> normal)
    let alphaOverride = null;
    if (this.recovering) {
      this.recoverFrames++;
      if (this.recoverFrames >= 8) {
        this.recovering = false;
      } else {
        alphaOverride = 0.18 + (this.recoverFrames * 0.06);
      }
    }

    // 1. Calculate rate of change (derivative)
    const dx = (rawPoint.x - this.prevRaw.x) / dt;
    const dy = (rawPoint.y - this.prevRaw.y) / dt;
    const dz = ((rawPoint.z || 0) - (this.prevRaw.z || 0)) / dt;
    this.prevRaw = { ...rawPoint };

    // 2. Filter the derivative
    const edx = this.dxFilter.filter(dx, this._alpha(dt, this.dCutoff));
    const edy = this.dyFilter.filter(dy, this._alpha(dt, this.dCutoff));
    const edz = this.dzFilter.filter(dz, this._alpha(dt, this.dCutoff));

    const speed = Math.sqrt(edx * edx + edy * edy + edz * edz);

    // 3. Dynamic cutoff frequency based on speed
    const cutoff = this.minCutoff + this.beta * speed;
    const normalAlpha = this._alpha(dt, cutoff);
    const alpha = alphaOverride !== null ? Math.min(alphaOverride, normalAlpha) : normalAlpha;

    // Fast-bypass: If sweeping fast, track directly with zero lag
    const effectiveAlpha = (speed > 1.4 && !this.recovering) ? 1.0 : alpha;

    return {
      x: this.xFilter.filter(rawPoint.x, effectiveAlpha),
      y: this.yFilter.filter(rawPoint.y, effectiveAlpha),
      z: this.zFilter.filter(rawPoint.z || 0, effectiveAlpha),
    };
  }

  _alpha(dt, cutoff) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }
}
