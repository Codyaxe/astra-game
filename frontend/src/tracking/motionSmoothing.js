/**
 * motionSmoothing.js — One-Euro Filter with Smooth Gap Recovery
 *
 * When MediaPipe loses tracking during fast hand motion (motion blur),
 * the cursor freezes at its last position. When tracking resumes,
 * the cursor smoothly glides to the new position instead of teleporting.
 */

class LowPassFilter {
  constructor() {
    this.s = null;
  }

  reset() {
    this.s = null;
  }

  filter(value, alpha) {
    if (this.s === null) {
      this.s = value;
      return value;
    }
    this.s = alpha * value + (1.0 - alpha) * this.s;
    return this.s;
  }

  lastValue() {
    return this.s;
  }
}

export class MotionSmoother {
  constructor(minCutoff = 1.0, beta = 0.05, dCutoff = 1.0) {
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

    // First frame ever — initialize everything
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

    // GAP RECOVERY: Hand was lost and just reappeared
    // Don't reset — smoothly blend toward the new position
    if (dt > 0.08) {
      // Reset only the derivative filters (velocity is stale/meaningless after a gap)
      this.dxFilter.reset();
      this.dyFilter.reset();
      this.dzFilter.reset();
      this.prevRaw = { ...rawPoint };

      // Enter recovery mode: use low alpha for smooth glide-to
      this.recovering = true;
      this.recoverFrames = 0;

      // Blend toward new position with recovery alpha
      const recoveryAlpha = 0.15;
      const fps = Math.round(1.0 / dt);
      console.log(
        `[TRACKING] 🔄 GAP RECOVERY | FPS: ${fps} | Gliding to Pos: (${rawPoint.x.toFixed(2)}, ${rawPoint.y.toFixed(2)}) | alpha: ${recoveryAlpha.toFixed(3)}`
      );

      return {
        x: this.xFilter.filter(rawPoint.x, recoveryAlpha),
        y: this.yFilter.filter(rawPoint.y, recoveryAlpha),
        z: this.zFilter.filter(rawPoint.z || 0, recoveryAlpha),
      };
    }

    // During recovery: ramp alpha up over ~8 frames (0.15 → 0.40 → normal)
    let alphaOverride = null;
    if (this.recovering) {
      this.recoverFrames++;
      if (this.recoverFrames >= 8) {
        this.recovering = false;
      } else {
        // Ramp: frame 1=0.20, frame 2=0.25, ..., frame 8=normal
        alphaOverride = 0.15 + (this.recoverFrames * 0.05);
      }
    }

    // Standard One-Euro filter
    const dx = (rawPoint.x - this.prevRaw.x) / dt;
    const dy = (rawPoint.y - this.prevRaw.y) / dt;
    const dz = ((rawPoint.z || 0) - (this.prevRaw.z || 0)) / dt;
    this.prevRaw = { ...rawPoint };

    const edx = this.dxFilter.filter(dx, this._alpha(dt, this.dCutoff));
    const edy = this.dyFilter.filter(dy, this._alpha(dt, this.dCutoff));
    const edz = this.dzFilter.filter(dz, this._alpha(dt, this.dCutoff));

    const speed = Math.sqrt(edx * edx + edy * edy + edz * edz);

    const cutoff = this.minCutoff + this.beta * speed;
    const normalAlpha = this._alpha(dt, cutoff);
    const alpha = alphaOverride !== null ? Math.min(alphaOverride, normalAlpha) : normalAlpha;

    // Diagnostic Telemetry Log
    const fps = Math.round(1.0 / dt);
    console.log(
      `[TRACKING] 📊 FPS: ${fps} | Speed: ${speed.toFixed(2)} | alpha: ${alpha.toFixed(3)}${this.recovering ? ' 🔄RECOVERING' : ''} | Pos: (${rawPoint.x.toFixed(2)}, ${rawPoint.y.toFixed(2)})`
    );

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
