/**
 * ConstellationCanvas.jsx — Main visual canvas rendering:
 * - Star nodes with visual radius + extended hitbox interactive zone
 * - Decoy fake stars
 * - Permanent validated connected lines
 * - Live active dragging line from current node to wand pointer when onDraw is true
 * - Wand cursor & magnetic snap visualizer
 */

import { useRef, useEffect, useCallback } from 'react';

const STAR_VISUAL_RADIUS = 12;
const FAKE_STAR_RADIUS = 8;

export default function ConstellationCanvas({
  starNodes = [],
  fakeNodes = [],
  completedConnections = [], // Array of { from: StarNode, to: StarNode }
  activeNode = null,         // StarNode currently being drawn from
  wandPointer = null,        // { x, y } (normalised)
  snappedPointer = null,     // { x, y, snapped }
  onDraw = false,            // whether line is actively being pulled
  width,
  height,
}) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Validated Completed Connections
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
    ctx.shadowBlur = 0; // reset shadow

    // 2. Draw Active Line from current activeNode to wand pointer when ON_DRAW = true
    if (onDraw && activeNode && (snappedPointer || wandPointer)) {
      const target = snappedPointer || wandPointer;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = snappedPointer?.snapped ? 'rgba(74, 222, 128, 0.9)' : 'rgba(108, 99, 255, 0.85)';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(activeNode.x * width, activeNode.y * height);
      ctx.lineTo(target.x * width, target.y * height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Draw Decoy Fake Stars
    for (const fake of fakeNodes) {
      const fx = fake.x * width;
      const fy = fake.y * height;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(fx, fy, FAKE_STAR_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Draw Real Star Nodes
    for (const node of starNodes) {
      const nx = node.x * width;
      const ny = node.y * height;
      const hitboxPx = (node.hitbox_radius || 0.055) * Math.min(width, height);
      const isActive = activeNode?.id === node.id;

      // Extended Hitbox ring (subtle guide)
      ctx.strokeStyle = isActive ? 'rgba(108, 99, 255, 0.4)' : 'rgba(255, 255, 255, 0.06)';
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
        ctx.fillStyle = 'rgba(228, 230, 240, 0.85)';
        ctx.font = '500 13px Outfit, sans-serif';
        ctx.fillText(node.label, nx + 16, ny + 4);
      }
    }

    // 5. Draw Wand Cursor with Snapping feedback
    const cursor = snappedPointer || wandPointer;
    if (cursor) {
      const cx = cursor.x * width;
      const cy = cursor.y * height;

      ctx.strokeStyle = onDraw ? '#4ade80' : '#6c63ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, cursor.snapped ? 22 : 15, 0, Math.PI * 2);
      ctx.stroke();

      // Reticle center dot
      ctx.fillStyle = onDraw ? '#4ade80' : '#6c63ff';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [starNodes, fakeNodes, completedConnections, activeNode, wandPointer, snappedPointer, onDraw, width, height]);

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
