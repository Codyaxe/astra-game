/**
 * motionSmoothing.js — Ultra-Responsive 1€ Filter with Diagnostic Telemetry Logging
 */

class LowPassFilter {
  constructor(alpha = 1.0) {
    this.alpha = alpha;
    this.s = null;
    this.lastRaw = null;
  }

  reset() {
    this.s = null;
    this.lastRaw = null;
  }

  filter(value, alpha = this.alpha) {
    this.lastRaw = value;
    if (this.s === null) {
      this.s = value;
      return value;
    }
    this.s = alpha * value + (1.0 - alpha) * this.s;
    return this.s;
  }
}

export class MotionSmoother {
  constructor(minCutoff = 1.5, beta = 0.05, dCutoff = 1.5) {
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
    this.lastLogTime = 0;
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
    
    // Stale Frame Protection: If > 80ms elapsed since last detection (hand was lost),
    // do NOT calculate velocity against stale data. Cleanly re-anchor at current position.
    if (dt > 0.08) {
      this.reset();
      this.lastTime = timestamp;
      this.prevRaw = { ...rawPoint };
      return {
        x: this.xFilter.filter(rawPoint.x, 1.0),
        y: this.yFilter.filter(rawPoint.y, 1.0),
        z: this.zFilter.filter(rawPoint.z || 0, 1.0),
      };
    }

    const fps = Math.round(1.0 / dt);
    this.lastTime = timestamp;

    // 1. Calculate instantaneous velocity derivative
    const dx = (rawPoint.x - this.prevRaw.x) / dt;
    const dy = (rawPoint.y - this.prevRaw.y) / dt;
    const dz = ((rawPoint.z || 0) - (this.prevRaw.z || 0)) / dt;
    this.prevRaw = { ...rawPoint };

    const edx = this.dxFilter.filter(dx, this._alpha(dt, this.dCutoff));
    const edy = this.dyFilter.filter(dy, this._alpha(dt, this.dCutoff));
    const edz = this.dzFilter.filter(dz, this._alpha(dt, this.dCutoff));

    const speed = Math.sqrt(edx * edx + edy * edy + edz * edz);

    // Diagnostic logging (every 300ms or when fast moving)
    const now = performance.now();
    if (speed > 0.8 || now - this.lastLogTime > 400) {
      this.lastLogTime = now;
      console.log(
        `[TRACKING] 📊 FPS: ${fps} | Speed: ${speed.toFixed(2)} | ` +
        (speed > 1.2 ? `⚡ FAST-BYPASS (0ms lag)` : `🎯 SMOOTHED (alpha=${this._alpha(dt, this.minCutoff + this.beta * speed).toFixed(3)})`) +
        ` | Pos: (${rawPoint.x.toFixed(2)}, ${rawPoint.y.toFixed(2)})`
      );
    }

    // 2. High-speed fast-bypass: If moving fast, lock alpha to 1.0 for instant zero-latency tracking
    if (speed > 1.2) {
      return {
        x: this.xFilter.filter(rawPoint.x, 1.0),
        y: this.yFilter.filter(rawPoint.y, 1.0),
        z: this.zFilter.filter(rawPoint.z || 0, 1.0),
      };
    }

    // 3. Dynamic Cutoff Frequency (One-Euro formulation)
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
