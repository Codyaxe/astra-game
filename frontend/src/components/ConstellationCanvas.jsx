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


// !subject to change to assets
function drawStarburst(ctx, {
  x,
  y,
  rays,
  outerRadius,
  innerRadius,
  rotation = 0,
  fillStyle = '#fef08a',
  strokeStyle = null,
  strokeWidth = 1,
}) {
  const points = Math.max(4, Math.round(rays));
  const step = Math.PI / points;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = rotation + i * step;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();

  ctx.fillStyle = fillStyle;
  ctx.fill();

  if (strokeStyle) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
}

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
  const starStyleRef = useRef(new Map());

  useEffect(() => {
    const styleMap = new Map();
    for (const node of starNodes) {
      styleMap.set(node.id, {
        rays: 5 + Math.floor(Math.random() * 4), // 5..8 rays, fixed per star for this round
        rotationOffset: Math.random() * Math.PI * 2,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    starStyleRef.current = styleMap;
  }, [starNodes]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const t = performance.now();
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
      const fakeTwinkle = 0.85 + 0.15 * Math.sin(t * 0.003 + fake.id * 0.5);

      drawStarburst(ctx, {
        x: fx,
        y: fy,
        rays: 4,
        outerRadius: FAKE_STAR_RADIUS * fakeTwinkle,
        innerRadius: FAKE_STAR_RADIUS * 0.4,
        rotation: (t * 0.0005) + fake.id,
        fillStyle: 'rgba(255, 255, 255, 0.3)',
      });
    }

    // 4. Draw Real Star Nodes
    for (const node of starNodes) {
      const nx = node.x * width;
      const ny = node.y * height;
      const hitboxPx = (node.hitbox_radius || 0.055) * Math.min(width, height);
      const isActive = activeNode?.id === node.id;
      const style = starStyleRef.current.get(node.id) || {
        rays: 6,
        rotationOffset: 0,
        twinklePhase: 0,
      };
      const rays = style.rays;
      const twinkle = 0.9 + 0.16 * Math.sin(t * 0.004 + style.twinklePhase);
      const outerRadius = STAR_VISUAL_RADIUS * (isActive ? 1.28 : 1.1) * twinkle;
      const innerRadius = STAR_VISUAL_RADIUS * (isActive ? 0.44 : 0.5) * twinkle;
      const starRotation = (t * 0.0008) + style.rotationOffset;

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

      // Starburst core with variable rays
      drawStarburst(ctx, {
        x: nx,
        y: ny,
        rays,
        outerRadius,
        innerRadius,
        rotation: starRotation,
        fillStyle: isActive ? '#a78bfa' : '#fef08a',
        strokeStyle: isActive ? 'rgba(196, 181, 253, 0.95)' : 'rgba(255, 255, 255, 0.75)',
        strokeWidth: 1,
      });

      // Hot center point keeps stars readable at a distance
      ctx.fillStyle = isActive ? '#ddd6fe' : '#fff8cc';
      ctx.beginPath();
      ctx.arc(nx, ny, Math.max(2.2, STAR_VISUAL_RADIUS * 0.2), 0, Math.PI * 2);
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
    let frameId;

    const renderFrame = () => {
      draw();
      frameId = requestAnimationFrame(renderFrame);
    };

    frameId = requestAnimationFrame(renderFrame);
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
