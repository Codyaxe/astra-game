/**
 * ConstellationCanvas.jsx — Main visual canvas rendering:
 * - Validated correct connections (Glowing Green)
 * - Mistake trails (Dashed Red)
 * - Decoy fake stars & Real star nodes
 * - Active drawing line & 2-finger manual snap reticle
 */

import { memo, useRef, useEffect, useCallback } from 'react';

const STAR_VISUAL_RADIUS = 12;
const FAKE_STAR_RADIUS = 8;

function ConstellationCanvas({
  starNodes = [],
  fakeNodes = [],
  completedConnections = [], // [{ from, to }] (Green)
  mistakeTrails = [],        // [{ from, to }] (Red)
  activeNode = null,         // StarNode currently being drawn from
  wandPointer = null,        // { x, y } (normalised)
  snappedPointer = null,     // { x, y, snapped, node }
  onDraw = false,            // whether manual snap / drawing is active
  width,
  height,
}) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Mistake Trails (Red Dashed Lines)
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ef4444';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
    ctx.shadowBlur = 8;
    ctx.setLineDash([6, 6]);
    for (const trail of mistakeTrails) {
      if (!trail.from || !trail.to) continue;
      ctx.beginPath();
      ctx.moveTo(trail.from.x * width, trail.from.y * height);
      ctx.lineTo(trail.to.x * width, trail.to.y * height);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // 2. Draw Validated Completed Connections (Glowing Green)
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#4ade80';
    ctx.shadowColor = 'rgba(74, 222, 128, 0.8)';
    ctx.shadowBlur = 10;
    for (const conn of completedConnections) {
      if (!conn.from || !conn.to) continue;
      ctx.beginPath();
      ctx.moveTo(conn.from.x * width, conn.from.y * height);
      ctx.lineTo(conn.to.x * width, conn.to.y * height);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 3. Draw Active Dragging Line from activeNode to Pointer/Snapped Target
    if (activeNode && (snappedPointer || wandPointer)) {
      const target = snappedPointer?.snapped ? snappedPointer : wandPointer;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = onDraw ? 'rgba(74, 222, 128, 0.9)' : 'rgba(108, 99, 255, 0.4)';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(activeNode.x * width, activeNode.y * height);
      ctx.lineTo(target.x * width, target.y * height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw Decoy Fake Stars
    for (const fake of fakeNodes) {
      const fx = fake.x * width;
      const fy = fake.y * height;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(fx, fy, FAKE_STAR_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Draw Real Star Nodes
    for (const node of starNodes) {
      const nx = node.x * width;
      const ny = node.y * height;
      const hitboxPx = (node.hitbox_radius || 0.025) * Math.min(width, height);
      const isActive = activeNode?.id === node.id;

      // Extended Hitbox ring (subtle guide)
      ctx.strokeStyle = isActive ? 'rgba(108, 99, 255, 0.5)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(nx, ny, hitboxPx, 0, Math.PI * 2);
      ctx.stroke();

      // Outer Star Glow
      const glow = ctx.createRadialGradient(nx, ny, 2, nx, ny, STAR_VISUAL_RADIUS * 2.2);
      glow.addColorStop(0, isActive ? 'rgba(108, 99, 255, 0.8)' : 'rgba(240, 230, 140, 0.6)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(nx, ny, STAR_VISUAL_RADIUS * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Core Star
      ctx.fillStyle = isActive ? '#a78bfa' : '#fef08a';
      ctx.beginPath();
      ctx.arc(nx, ny, STAR_VISUAL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Star Label
      if (node.label) {
        ctx.fillStyle = 'rgba(228, 230, 240, 0.9)';
        ctx.font = '500 13px Outfit, sans-serif';
        ctx.fillText(node.label, nx + 16, ny + 4);
      }
    }

    // 6. Draw Wand Cursor & Manual Snap Reticle
    const cursor = snappedPointer || wandPointer;
    if (cursor) {
      const cx = cursor.x * width;
      const cy = cursor.y * height;

      ctx.strokeStyle = onDraw ? '#4ade80' : '#6c63ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, cursor.snapped ? 24 : 14, 0, Math.PI * 2);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = onDraw ? '#4ade80' : '#6c63ff';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [starNodes, fakeNodes, completedConnections, mistakeTrails, activeNode, wandPointer, snappedPointer, onDraw, width, height]);

  useEffect(() => {
    const frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}

function arePointersEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.x - b.x) < 0.0005 &&
    Math.abs(a.y - b.y) < 0.0005 &&
    Math.abs((a.z || 0) - (b.z || 0)) < 0.0005 &&
    Boolean(a.snapped) === Boolean(b.snapped)
  );
}

function arePropsEqual(prev, next) {
  return (
    prev.starNodes === next.starNodes &&
    prev.fakeNodes === next.fakeNodes &&
    prev.completedConnections === next.completedConnections &&
    prev.mistakeTrails === next.mistakeTrails &&
    prev.activeNode === next.activeNode &&
    prev.onDraw === next.onDraw &&
    prev.width === next.width &&
    prev.height === next.height &&
    arePointersEqual(prev.wandPointer, next.wandPointer) &&
    arePointersEqual(prev.snappedPointer, next.snappedPointer)
  );
}

export default memo(ConstellationCanvas, arePropsEqual);
