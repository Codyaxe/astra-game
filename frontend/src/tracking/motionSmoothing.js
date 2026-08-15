/**
 * motionSmoothing.js — Pure One-Euro (€1) Adaptive Filter (Casiez et al., CHI 2012)
 *
 * Characteristics:
 * - Low speed / Still: High filtering to eliminate sensor tremor and jitter.
 * - High speed / Fast sweeps: Zero lag, alpha -> 1.0, 1:1 instant responsiveness.
 */

class LowPassFilter {
  constructor(alpha = 1.0) {
    this.alpha = alpha;
    this.s = null;
  }

  reset() {
    this.s = null;
  }

  filter(value, alpha = this.alpha) {
    if (this.s === null) {
      this.s = value;
      return value;
    }
    this.s = alpha * value + (1.0 - alpha) * this.s;
    return this.s;
  }
}

export class MotionSmoother {
  constructor(minCutoff = 1.0, beta = 0.05, dCutoff = 1.0) {
    this.minCutoff = minCutoff; // Hz: Minimum cutoff frequency at zero speed
    this.beta = beta;           // Velocity coefficient: responsiveness to speed
    this.dCutoff = dCutoff;     // Hz: Cutoff frequency for derivative

    this.xFilter = new LowPassFilter();
    this.yFilter = new LowPassFilter();
    this.zFilter = new LowPassFilter();

    this.dxFilter = new LowPassFilter();
    this.dyFilter = new LowPassFilter();
    this.dzFilter = new LowPassFilter();

    this.lastTime = null;
    this.prevRaw = null;
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
  }

  smooth(rawPoint, timestamp = performance.now()) {
    if (!rawPoint) return null;

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

    // Reset filter state if tracking was interrupted (gap > 100ms)
    if (dt > 0.1) {
      this.reset();
      this.lastTime = timestamp;
      this.prevRaw = { ...rawPoint };
      return {
        x: this.xFilter.filter(rawPoint.x, 1.0),
        y: this.yFilter.filter(rawPoint.y, 1.0),
        z: this.zFilter.filter(rawPoint.z || 0, 1.0),
      };
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
    const alpha = this._alpha(dt, cutoff);

    return {
      x: this.xFilter.filter(rawPoint.x, alpha),
      y: this.yFilter.filter(rawPoint.y, alpha),
      z: this.zFilter.filter(rawPoint.z || 0, alpha),
    };
  }

  _alpha(dt, cutoff) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }
}
