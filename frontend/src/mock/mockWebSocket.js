/**
 * mockWebSocket.js — Simulates real-time WebSocket connection
 * Emits live wand cursor positions and game mechanic validation events.
 */

export class MockWebSocketClient {
  constructor() {
    this.listeners = new Map();
    this.intervalId = null;
    this.isConnected = false;
    this.cursorX = 0.5;
    this.cursorY = 0.5;
    this.targetX = 0.5;
    this.targetY = 0.5;
    this.isDrawing = false;
  }

  connect() {
    this.isConnected = true;
    this._emit("open", { timestamp: Date.now() });

    // Smooth movement loop simulating live wand stream
    this.intervalId = setInterval(() => {
      if (!this.isConnected) return;

      // Wand lerp interpolation
      this.cursorX += (this.targetX - this.cursorX) * 0.2;
      this.cursorY += (this.targetY - this.cursorY) * 0.2;

      this._emit("wand_update", {
        x: this.cursorX,
        y: this.cursorY,
        isDrawing: this.isDrawing,
      });
    }, 1000 / 60); // 60 FPS update stream
  }

  disconnect() {
    this.isConnected = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this._emit("close", { timestamp: Date.now() });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners
      .get(event)
      .filter((cb) => cb !== callback);
    this.listeners.set(event, callbacks);
  }

  _emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((cb) => cb(data));
  }

  // ---- Simulation Trigger Helpers for Demo / Testing ----

  updatePointerPosition(normX, normY, isDrawing = false) {
    this.targetX = normX;
    this.targetY = normY;
    this.isDrawing = isDrawing;
  }

  triggerSegmentSuccess(fromStarId, toStarId) {
    this._emit("segment_connected", {
      from: fromStarId,
      to: toStarId,
      timestamp: Date.now(),
    });
  }

  triggerWin(finalScore = 95) {
    this._emit("round_win", {
      score: finalScore,
      completedAt: Date.now(),
    });
  }

  triggerFail(reason = "time_expired") {
    this._emit("round_fail", {
      reason,
      completedAt: Date.now(),
    });
  }
}
