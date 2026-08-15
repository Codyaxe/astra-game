/**
 * motionSmoothing.js — Dynamic Velocity-Adaptive Pointer Smoothing (One-Euro Filter)
 *
 * Eliminates camera tracking jitter:
 * - At low speeds / holding still: High smoothing (eliminates tremor & sensor noise).
 * - At high speeds / sweeping: Low smoothing (zero latency & instant responsiveness).
 */

export class MotionSmoother {
  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff; // Minimum cutoff frequency (lower = smoother when still)
    this.beta = beta;           // Velocity coefficient (higher = faster response when moving)
    this.dCutoff = dCutoff;     // Derivative cutoff frequency

    this.xFilter = new LowPassFilter();
    this.yFilter = new LowPassFilter();
    this.zFilter = new LowPassFilter();

    this.dxFilter = new LowPassFilter();
    this.dyFilter = new LowPassFilter();
    this.dzFilter = new LowPassFilter();

    this.lastTime = null;
  }

  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
    this.zFilter.reset();
    this.dxFilter.reset();
    this.dyFilter.reset();
    this.dzFilter.reset();
    this.lastTime = null;
  }

  smooth(rawPoint, timestamp = Date.now()) {
    if (!rawPoint) return null;

    if (this.lastTime === null) {
      this.lastTime = timestamp;
      return {
        x: this.xFilter.filter(rawPoint.x, 1.0),
        y: this.yFilter.filter(rawPoint.y, 1.0),
        z: this.zFilter.filter(rawPoint.z || 0, 1.0),
      };
    }

    const dt = Math.max((timestamp - this.lastTime) / 1000.0, 0.001);
    this.lastTime = timestamp;

    // 1. Calculate rate of change (velocity derivative)
    const dx = (rawPoint.x - (this.xFilter.lastRaw || rawPoint.x)) / dt;
    const dy = (rawPoint.y - (this.yFilter.lastRaw || rawPoint.y)) / dt;
    const dz = ((rawPoint.z || 0) - (this.zFilter.lastRaw || 0)) / dt;

    const edx = this.dxFilter.filter(dx, this._alpha(dt, this.dCutoff));
    const edy = this.dyFilter.filter(dy, this._alpha(dt, this.dCutoff));
    const edz = this.dzFilter.filter(dz, this._alpha(dt, this.dCutoff));

    const speed = Math.sqrt(edx * edx + edy * edy + edz * edz);

    // 2. Adaptive cutoff: increase frequency as speed increases
    const cutoff = this.minCutoff + this.beta * speed;
    const alpha = this._alpha(dt, cutoff);

    // 3. Filter coordinates
    const sx = this.xFilter.filter(rawPoint.x, alpha);
    const sy = this.yFilter.filter(rawPoint.y, alpha);
    const sz = this.zFilter.filter(rawPoint.z || 0, alpha);

    return { x: sx, y: sy, z: sz };
  }

  _alpha(dt, cutoff) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }
}

class LowPassFilter {
  constructor() {
    this.lastFiltered = null;
    this.lastRaw = null;
  }

  reset() {
    this.lastFiltered = null;
    this.lastRaw = null;
  }

  filter(value, alpha) {
    this.lastRaw = value;
    if (this.lastFiltered === null) {
      this.lastFiltered = value;
      return value;
    }
    const filtered = alpha * value + (1.0 - alpha) * this.lastFiltered;
    this.lastFiltered = filtered;
    return filtered;
  }
}
