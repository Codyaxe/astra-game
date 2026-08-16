/**
 * TutorialTracingGuide.jsx — Animated Holographic Reticle & Tracing Guide
 *
 * Renders an animated celestial ghost wand reticle that smoothly traces through
 * the tutorial constellation star nodes (A -> B -> C -> D) with glowing starlight beams,
 * node arrival ripples, and animated laser dash guides.
 */

import React, { useState, useEffect, useRef } from 'react';

export default function TutorialTracingGuide({
  starNodes = [], // Array of { id, x, y, label, next_node_id }
  toPx = null, // Coord converter (normX, normY) => { x, y }
  width = window.innerWidth,
  height = window.innerHeight,
  isActive = true,
}) {
  const [animProgress, setAnimProgress] = useState(0);
  const [completedSegIndex, setCompletedSegIndex] = useState(-1);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Build the ordered chain of stars (Head -> next -> next ...)
  const orderedStars = React.useMemo(() => {
    if (!starNodes || starNodes.length === 0) return [];
    
    // Find head star (id with smallest id or matching head)
    const starMap = new Map(starNodes.map((s) => [s.id, s]));
    let head = starNodes.find((s) => s.id === 0) || starNodes[0];
    
    const chain = [head];
    let curr = head;
    const visited = new Set([head.id]);

    while (curr && curr.next_node_id !== null && curr.next_node_id !== undefined) {
      const next = starMap.get(curr.next_node_id);
      if (!next || visited.has(next.id)) break;
      visited.add(next.id);
      chain.push(next);
      curr = next;
    }

    // If chain didn't catch all, fallback to list order
    return chain.length > 1 ? chain : starNodes;
  }, [starNodes]);

  // Convert stars to screen pixel positions
  const pxNodes = React.useMemo(() => {
    return orderedStars.map((s) => {
      if (toPx) return { ...s, ...toPx(s.x, s.y) };
      return { ...s, x: s.x * width, y: s.y * height };
    });
  }, [orderedStars, toPx, width, height]);

  // Animation Loop (60 FPS smooth continuous wall-clock interpolation)
  useEffect(() => {
    if (!isActive || pxNodes.length < 2) return;

    const segmentCount = pxNodes.length - 1;
    const segDurationMs = 1400; // ms per segment
    const pauseAtEndMs = 1000;
    const totalDurationMs = segmentCount * segDurationMs + pauseAtEndMs;

    function loop() {
      const elapsed = (Date.now() - startTimeRef.current) % totalDurationMs;
      const t = elapsed / totalDurationMs;
      setAnimProgress(t);

      const activeTime = elapsed;
      const maxDrawTime = segmentCount * segDurationMs;
      if (activeTime < maxDrawTime) {
        const segIdx = Math.floor(activeTime / segDurationMs);
        setCompletedSegIndex(segIdx);
      } else {
        setCompletedSegIndex(segmentCount);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    }

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, pxNodes.length]);

  if (!isActive || pxNodes.length < 2) return null;

  const segmentCount = pxNodes.length - 1;
  const segDurationMs = 1400;
  const pauseAtEndMs = 1000;
  const maxDrawTime = segmentCount * segDurationMs;
  const totalDurationMs = segmentCount * segDurationMs + pauseAtEndMs;
  const elapsed = (animProgress * totalDurationMs);

  // Calculate current reticle (cursor) position
  let cursorX = pxNodes[0].x;
  let cursorY = pxNodes[0].y;
  let activeSegIdx = 0;
  let isPausingAtEnd = false;

  if (elapsed >= maxDrawTime) {
    // Finished all segments, holding at final star before loop reset
    const last = pxNodes[pxNodes.length - 1];
    cursorX = last.x;
    cursorY = last.y;
    isPausingAtEnd = true;
  } else {
    activeSegIdx = Math.floor(elapsed / segDurationMs);
    const segT = (elapsed % segDurationMs) / segDurationMs;
    // Smooth easeInOut curve
    const easeT = segT < 0.5 ? 2 * segT * segT : -1 + (4 - 2 * segT) * segT;

    const fromNode = pxNodes[activeSegIdx];
    const toNode = pxNodes[activeSegIdx + 1];

    if (fromNode && toNode) {
      cursorX = fromNode.x + (toNode.x - fromNode.x) * easeT;
      cursorY = fromNode.y + (toNode.y - fromNode.y) * easeT;
    }
  }

  return (
    <svg
      className="tutorial-tracing-guide"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 15,
      }}
    >
      <defs>
        {/* Neon Gold & Cyan Glow Filters */}
        <filter id="guideGlowCyan" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur1" />
          <feGaussianBlur stdDeviation="10" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="guideGlowGold" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="blur1" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. Underlying Animated Pulsing Dashed Guide Path */}
      {pxNodes.map((node, i) => {
        if (i >= pxNodes.length - 1) return null;
        const next = pxNodes[i + 1];
        return (
          <line
            key={`guide-base-${i}`}
            x1={node.x}
            y1={node.y}
            x2={next.x}
            y2={next.y}
            stroke="rgba(0, 240, 255, 0.3)"
            strokeWidth="2.5"
            strokeDasharray="6 8"
            style={{
              animation: 'dashMove 1s linear infinite',
            }}
          />
        );
      })}

      {/* 2. Active Tracing Starlight Beam drawn by the Ghost Reticle */}
      {pxNodes.map((node, i) => {
        if (i >= pxNodes.length - 1) return null;
        const next = pxNodes[i + 1];

        // Fully completed segments
        if (i < activeSegIdx || isPausingAtEnd) {
          return (
            <g key={`drawn-full-${i}`}>
              {/* Outer Cyan Glow Beam */}
              <line
                x1={node.x}
                y1={node.y}
                x2={next.x}
                y2={next.y}
                stroke="#00F0FF"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#guideGlowCyan)"
                opacity="0.85"
              />
              {/* Core Bright White/Gold Laser */}
              <line
                x1={node.x}
                y1={node.y}
                x2={next.x}
                y2={next.y}
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          );
        }

        // Currently animating segment (drawing from node to cursor)
        if (i === activeSegIdx && !isPausingAtEnd) {
          return (
            <g key={`drawn-active-${i}`}>
              <line
                x1={node.x}
                y1={node.y}
                x2={cursorX}
                y2={cursorY}
                stroke="#F4D58D"
                strokeWidth="5"
                strokeLinecap="round"
                filter="url(#guideGlowGold)"
                opacity="0.9"
              />
              <line
                x1={node.x}
                y1={node.y}
                x2={cursorX}
                y2={cursorY}
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          );
        }

        return null;
      })}

      {/* 3. Star Target Landmark Pulsing Rings */}
      {pxNodes.map((node, idx) => {
        const isReached = idx <= activeSegIdx || isPausingAtEnd;
        return (
          <g key={`target-ring-${idx}`} transform={`translate(${node.x}, ${node.y})`}>
            {/* Outer Target Circle */}
            <circle
              r="16"
              fill="none"
              stroke={isReached ? '#00F0FF' : 'rgba(0, 240, 255, 0.4)'}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity={isReached ? '0.85' : '0.4'}
            />
          </g>
        );
      })}

      {/* 4. Animated Holographic Ghost Wand Reticle */}
      <g transform={`translate(${cursorX}, ${cursorY})`}>
        {/* Outer Rotating Reticle Ring */}
        <circle
          r="22"
          fill="none"
          stroke="#F4D58D"
          strokeWidth="2"
          strokeDasharray="8 6"
          filter="url(#guideGlowGold)"
          style={{ animation: 'spinClockwise 4s linear infinite' }}
        />
        {/* Inner Counter-Rotating Bracket Ring */}
        <circle
          r="14"
          fill="rgba(244, 213, 141, 0.15)"
          stroke="#00F0FF"
          strokeWidth="1.5"
          filter="url(#guideGlowCyan)"
        />
        {/* Central Wand Spark */}
        <circle r="4" fill="#FFFFFF" filter="url(#guideGlowCyan)" />
      </g>

      <style>{`
        @keyframes dashMove {
          0% { stroke-dashoffset: 28; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes spinClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}
