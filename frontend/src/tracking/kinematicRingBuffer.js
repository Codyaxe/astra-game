/**
 * kinematicRingBuffer.js — High-Performance Circular Trajectory History Buffer
 *
 * Provides:
 * 1. Zero-allocation ring buffer storage for time-stamped coordinates (x, y, z, t).
 * 2. Multi-point Least-Squares Linear Regression velocity estimation (noise-immune).
 * 3. Kinematic dead-reckoning extrapolation with physical friction decay.
 * 4. Cubic Hermite Spline trajectory interpolation between tracking gaps.
 */

export class KinematicRingBuffer {
  constructor(capacity = 60, maxAgeMs = 400) {
    this.capacity = capacity;
    this.maxAgeMs = maxAgeMs;

    // Pre-allocated ring buffer entries
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.z = new Float32Array(capacity);
    this.t = new Float64Array(capacity);

    this.head = 0; // Insertion index
    this.size = 0; // Number of valid items
  }

  reset() {
    this.head = 0;
    this.size = 0;
  }

  /**
   * Push a new time-stamped coordinate into the ring buffer.
   */
  push(point, timestamp = performance.now()) {
    if (!point) return;

    this.x[this.head] = point.x;
    this.y[this.head] = point.y;
    this.z[this.head] = point.z || 0;
    this.t[this.head] = timestamp;

    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  /**
   * Returns array of recent samples within maxAgeMs in chronological order.
   */
  getRecentHistory(windowMs = this.maxAgeMs, now = performance.now()) {
    const cutoff = now - windowMs;
    const history = [];

    for (let i = 0; i < this.size; i++) {
      const idx = (this.head - 1 - i + this.capacity) % this.capacity;
      const time = this.t[idx];
      if (time < cutoff) break;

      history.unshift({
        x: this.x[idx],
        y: this.y[idx],
        z: this.z[idx],
        t: time,
      });
    }

    return history;
  }

  /**
   * Get latest inserted coordinate.
   */
  getLatest() {
    if (this.size === 0) return null;
    const idx = (this.head - 1 + this.capacity) % this.capacity;
    return {
      x: this.x[idx],
      y: this.y[idx],
      z: this.z[idx],
      t: this.t[idx],
    };
  }

  /**
   * Computes robust velocity (vx, vy, speed) over a rolling time window
   * using Multi-Point Least-Squares Regression to filter out single-frame jitter.
   */
  getRobustVelocity(windowMs = 90, now = performance.now()) {
    const history = this.getRecentHistory(windowMs, now);
    if (history.length < 2) {
      return { vx: 0, vy: 0, vz: 0, speed: 0 };
    }

    const n = history.length;
    let sumT = 0, sumX = 0, sumY = 0, sumZ = 0;
    let sumT2 = 0, sumTX = 0, sumTY = 0, sumTZ = 0;

    const t0 = history[0].t;

    for (let i = 0; i < n; i++) {
      const dtSec = (history[i].t - t0) / 1000.0;
      sumT += dtSec;
      sumT2 += dtSec * dtSec;

      sumX += history[i].x;
      sumTX += dtSec * history[i].x;

      sumY += history[i].y;
      sumTY += dtSec * history[i].y;

      sumZ += history[i].z;
      sumTZ += dtSec * history[i].z;
    }

    const denom = n * sumT2 - sumT * sumT;
    if (Math.abs(denom) < 1e-6) {
      // Fallback to simple endpoint differential
      const first = history[0];
      const last = history[n - 1];
      const totalDt = Math.max((last.t - first.t) / 1000.0, 0.001);
      const vx = (last.x - first.x) / totalDt;
      const vy = (last.y - first.y) / totalDt;
      return { vx, vy, vz: 0, speed: Math.hypot(vx, vy) };
    }

    const vx = (n * sumTX - sumT * sumX) / denom;
    const vy = (n * sumTY - sumT * sumY) / denom;
    const vz = (n * sumTZ - sumT * sumZ) / denom;
    const speed = Math.hypot(vx, vy);

    return { vx, vy, vz, speed };
  }

  /**
   * Dead-reckoning extrapolation: predicts future position along momentum vector with friction decay.
   */
  extrapolate(now = performance.now(), maxExtrapolateMs = 280, friction = 3.5) {
    const latest = this.getLatest();
    if (!latest) return null;

    const dtMs = now - latest.t;
    if (dtMs <= 0) return { x: latest.x, y: latest.y, z: latest.z };
    if (dtMs > maxExtrapolateMs) return null;

    const { vx, vy, vz } = this.getRobustVelocity(80, latest.t);
    const dtSec = dtMs / 1000.0;

    // Exponential friction velocity decay: v(t) = v0 * exp(-friction * t)
    // Integral position delta: dx = v0 * (1 - exp(-friction * t)) / friction
    const decayFactor = (1.0 - Math.exp(-friction * dtSec)) / friction;

    const predX = Math.min(0.98, Math.max(0.02, latest.x + vx * decayFactor));
    const predY = Math.min(0.98, Math.max(0.02, latest.y + vy * decayFactor));
    const predZ = latest.z + vz * decayFactor;

    return { x: predX, y: predY, z: predZ, isExtrapolated: true };
  }

  /**
   * Cubic Hermite Spline interpolation across a tracking gap between p0 (with v0) and p1 (with v1).
   */
  static hermiteInterpolate(p0, v0, p1, v1, tProgress) {
    const t = Math.max(0, Math.min(1, tProgress));
    const t2 = t * t;
    const t3 = t2 * t;

    // Hermite basis functions
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    return {
      x: h00 * p0.x + h10 * v0.x + h01 * p1.x + h11 * v1.x,
      y: h00 * p0.y + h10 * v0.y + h01 * p1.y + h11 * v1.y,
      z: h00 * (p0.z || 0) + h10 * (v0.z || 0) + h01 * (p1.z || 0) + h11 * (v1.z || 0),
    };
  }
}
