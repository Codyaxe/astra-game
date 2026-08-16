/**
 * TutorialTracingGuide.jsx — Animated Holographic Reticle & Tracing Guide
 *
 * Demonstrates both:
 * Phase 1: Forward correct constellation tracing (A -> B -> C -> D) with cyan/gold starlight beams.
 * Phase 2: Mistake & Backtracking demonstration: Traces an incorrect line to a decoy star,
 *          shows the mistake indicator, and then backtracks backward to remove/undo it!
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

export default function TutorialTracingGuide({
  starNodes = [], // Array of { id, x, y, label, next_node_id }
  fakeNodes = [], // Array of { id, x, y } (decoy stars)
  toPx = null,    // Coord converter (normX, normY) => { x, y }
  width = window.innerWidth,
  height = window.innerHeight,
  isActive = true,
}) {
  const [animProgress, setAnimProgress] = useState(0);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Build the ordered chain of authentic stars (Head -> next -> next ...)
  const orderedStars = useMemo(() => {
    if (!starNodes || starNodes.length === 0) return [];
    
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

    return chain.length > 1 ? chain : starNodes;
  }, [starNodes]);

  // Convert stars to screen pixel positions
  const pxNodes = useMemo(() => {
    return orderedStars.map((s) => {
      if (toPx) return { ...s, ...toPx(s.x, s.y) };
      return { ...s, x: s.x * width, y: s.y * height };
    });
  }, [orderedStars, toPx, width, height]);

  // Convert fake decoy stars to screen pixel positions
  const pxFakeNodes = useMemo(() => {
    return (fakeNodes || []).map((s) => {
      if (toPx) return { ...s, ...toPx(s.x, s.y) };
      return { ...s, x: s.x * width, y: s.y * height };
    });
  }, [fakeNodes, toPx, width, height]);

  // Timeline Constants (Total duration: 10,800 ms)
  const PHASE1_DURATION = 5000;
  const PHASE2_DURATION = 5800;
  const TOTAL_CYCLE_MS = PHASE1_DURATION + PHASE2_DURATION;

  // Animation Loop
  useEffect(() => {
    if (!isActive || pxNodes.length < 2) return;

    function loop() {
      const elapsed = (Date.now() - startTimeRef.current) % TOTAL_CYCLE_MS;
      setAnimProgress(elapsed);
      animFrameRef.current = requestAnimationFrame(loop);
    }

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, pxNodes.length, TOTAL_CYCLE_MS]);

  if (!isActive || pxNodes.length < 2) return null;

  const isPhase1 = animProgress < PHASE1_DURATION;
  const phase1Elapsed = animProgress;
  const phase2Elapsed = animProgress - PHASE1_DURATION;

  // Pick origin star and decoy star for Phase 2 mistake demonstration
  const originStar = pxNodes[1] || pxNodes[0];
  const decoyStar = pxFakeNodes[0] || {
    x: originStar.x + (originStar.x < width * 0.5 ? 140 : -140),
    y: originStar.y + 120,
    id: 999,
  };

  // Ease In-Out helper
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

  // ---- PHASE 1 POSITIONS (Connect A -> B -> C -> D) ----
  const p1SegCount = pxNodes.length - 1;
  const p1SegDuration = 3800 / p1SegCount;
  let p1CursorX = pxNodes[0].x;
  let p1CursorY = pxNodes[0].y;
  let p1ActiveSegIdx = 0;
  let p1IsHolding = false;

  if (phase1Elapsed >= 3800) {
    p1IsHolding = true;
    p1CursorX = pxNodes[pxNodes.length - 1].x;
    p1CursorY = pxNodes[pxNodes.length - 1].y;
  } else {
    p1ActiveSegIdx = Math.floor(phase1Elapsed / p1SegDuration);
    const segT = (phase1Elapsed % p1SegDuration) / p1SegDuration;
    const easeT = easeInOut(segT);
    const fromNode = pxNodes[p1ActiveSegIdx];
    const toNode = pxNodes[p1ActiveSegIdx + 1];
    if (fromNode && toNode) {
      p1CursorX = fromNode.x + (toNode.x - fromNode.x) * easeT;
      p1CursorY = fromNode.y + (toNode.y - fromNode.y) * easeT;
    }
  }

  // ---- PHASE 2 POSITIONS (Mistake to Decoy + Backtracking) ----
  let p2CursorX = originStar.x;
  let p2CursorY = originStar.y;
  let p2State = 'glide_to_origin'; // 'glide_to_origin' | 'draw_mistake' | 'hold_mistake' | 'backtrack' | 'undo_burst'
  let p2DrawT = 0; // 0 to 1

  if (!isPhase1) {
    if (phase2Elapsed < 600) {
      // 0 - 600ms: Glide smoothly from end of Phase 1 to origin star
      p2State = 'glide_to_origin';
      const t = easeInOut(phase2Elapsed / 600);
      const startPt = pxNodes[pxNodes.length - 1];
      p2CursorX = startPt.x + (originStar.x - startPt.x) * t;
      p2CursorY = startPt.y + (originStar.y - startPt.y) * t;
    } else if (phase2Elapsed < 2000) {
      // 600 - 2000ms: Draw mistake line from origin to decoy star
      p2State = 'draw_mistake';
      p2DrawT = easeInOut((phase2Elapsed - 600) / 1400);
      p2CursorX = originStar.x + (decoyStar.x - originStar.x) * p2DrawT;
      p2CursorY = originStar.y + (decoyStar.y - originStar.y) * p2DrawT;
    } else if (phase2Elapsed < 2900) {
      // 2000 - 2900ms: Hold at decoy star (Pulsing mistake warning)
      p2State = 'hold_mistake';
      p2DrawT = 1.0;
      p2CursorX = decoyStar.x;
      p2CursorY = decoyStar.y;
    } else if (phase2Elapsed < 4500) {
      // 2900 - 4500ms: Backtrack along the red line from decoy back to origin!
      p2State = 'backtrack';
      const backT = easeInOut((phase2Elapsed - 2900) / 1600);
      p2DrawT = 1.0 - backT;
      p2CursorX = decoyStar.x + (originStar.x - decoyStar.x) * backT;
      p2CursorY = decoyStar.y + (originStar.y - decoyStar.y) * backT;
    } else {
      // 4500 - 5800ms: Undo Complete! Red line removed, sparkling burst
      p2State = 'undo_burst';
      p2DrawT = 0;
      p2CursorX = originStar.x;
      p2CursorY = originStar.y;
    }
  }

  const cursorX = isPhase1 ? p1CursorX : p2CursorX;
  const cursorY = isPhase1 ? p1CursorY : p2CursorY;

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
        {/* Glow Filters */}
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

        <filter id="guideGlowRed" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="blur1" />
          <feGaussianBlur stdDeviation="12" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ========================================================================= */}
      {/* PHASE 1: FORWARD CONSTELLATION TRACING                                    */}
      {/* ========================================================================= */}
      {isPhase1 && (
        <g className="phase1-group">
          {/* 1. Underlying Pulsing Dashed Guide Lines */}
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
                style={{ animation: 'dashMove 1s linear infinite' }}
              />
            );
          })}

          {/* 2. Active Starlight Beams */}
          {pxNodes.map((node, i) => {
            if (i >= pxNodes.length - 1) return null;
            const next = pxNodes[i + 1];

            if (i < p1ActiveSegIdx || p1IsHolding) {
              return (
                <g key={`drawn-full-${i}`}>
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

            if (i === p1ActiveSegIdx && !p1IsHolding) {
              return (
                <g key={`drawn-active-${i}`}>
                  <line
                    x1={node.x}
                    y1={node.y}
                    x2={p1CursorX}
                    y2={p1CursorY}
                    stroke="#F4D58D"
                    strokeWidth="5"
                    strokeLinecap="round"
                    filter="url(#guideGlowGold)"
                    opacity="0.9"
                  />
                  <line
                    x1={node.x}
                    y1={node.y}
                    x2={p1CursorX}
                    y2={p1CursorY}
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </g>
              );
            }

            return null;
          })}

          {/* 3. Star Target Rings */}
          {pxNodes.map((node, idx) => (
            <g key={`target-ring-${idx}`} transform={`translate(${node.x}, ${node.y})`}>
              <circle
                r="18"
                fill="none"
                stroke="#00F0FF"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.75"
              />
            </g>
          ))}
        </g>
      )}

      {/* ========================================================================= */}
      {/* PHASE 2: MISTAKE & BACKTRACK / UNDO DEMONSTRATION                         */}
      {/* ========================================================================= */}
      {!isPhase1 && (
        <g className="phase2-group">
          {/* Target Decoy Star Pulsing Ring */}
          <g transform={`translate(${decoyStar.x}, ${decoyStar.y})`}>
            <circle
              r="22"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              strokeDasharray="4 4"
              style={{ animation: 'pulseRing 1.2s ease-in-out infinite' }}
            />
            <text
              y="32"
              textAnchor="middle"
              fill="#FCA5A5"
              fontSize="11"
              fontWeight="900"
              style={{ letterSpacing: '0.8px', textShadow: '0 0 6px rgba(239,68,68,0.8)' }}
            >
              DECOY STAR
            </text>
          </g>

          {/* Origin Star Ring */}
          <g transform={`translate(${originStar.x}, ${originStar.y})`}>
            <circle
              r="18"
              fill="none"
              stroke="#00F0FF"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.8"
            />
          </g>

          {/* The Red Mistake Line (Rendered while drawing, holding, or backtracking) */}
          {(p2State === 'draw_mistake' || p2State === 'hold_mistake' || p2State === 'backtrack') && (
            <g>
              {/* Outer Glowing Red Stroke */}
              <line
                x1={originStar.x}
                y1={originStar.y}
                x2={originStar.x + (decoyStar.x - originStar.x) * p2DrawT}
                y2={originStar.y + (decoyStar.y - originStar.y) * p2DrawT}
                stroke="#EF4444"
                strokeWidth="7"
                strokeOpacity="0.85"
                strokeDasharray="10 6"
                strokeLinecap="round"
                filter="url(#guideGlowRed)"
                style={{ animation: 'reverseDashFlow 1s linear infinite' }}
              />
              {/* Inner Core Line */}
              <line
                x1={originStar.x}
                y1={originStar.y}
                x2={originStar.x + (decoyStar.x - originStar.x) * p2DrawT}
                y2={originStar.y + (decoyStar.y - originStar.y) * p2DrawT}
                stroke="#FCA5A5"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Midpoint Holographic Undo Badge */}
              <g
                transform={`translate(${(originStar.x + decoyStar.x) / 2}, ${(originStar.y + decoyStar.y) / 2})`}
                style={{ animation: 'undoPillPulse 1.4s ease-in-out infinite' }}
              >
                <rect
                  x="-85"
                  y="-14"
                  width="170"
                  height="28"
                  rx="14"
                  fill="rgba(15, 23, 42, 0.94)"
                  stroke="#EF4444"
                  strokeWidth="1.8"
                  filter="drop-shadow(0 0 12px rgba(239, 68, 68, 0.8))"
                />
                <text
                  x="0"
                  y="4"
                  fill="#FEE2E2"
                  fontSize="11"
                  fontWeight="900"
                  textAnchor="middle"
                  letterSpacing="0.8px"
                  style={{ textShadow: '0 0 8px rgba(239, 68, 68, 0.9)' }}
                >
                  RETRACE TO UNDO
                </text>
              </g>
            </g>
          )}

          {/* Undo Success Ring Burst */}
          {p2State === 'undo_burst' && (
            <g transform={`translate(${originStar.x}, ${originStar.y})`}>
              <circle
                r="36"
                fill="rgba(74, 222, 128, 0.15)"
                stroke="#4ADE80"
                strokeWidth="2.5"
                filter="url(#guideGlowCyan)"
                style={{ animation: 'burstOut 0.8s ease-out forwards' }}
              />
              <text
                y="-24"
                textAnchor="middle"
                fill="#4ADE80"
                fontSize="12"
                fontWeight="900"
                letterSpacing="1px"
                style={{ textShadow: '0 0 10px rgba(74,222,128,0.9)' }}
              >
                MISTAKE CLEARED
              </text>
            </g>
          )}
        </g>
      )}

      {/* ========================================================================= */}
      {/* 4. Animated Holographic Ghost Reticle Cursor                              */}
      {/* ========================================================================= */}
      <g transform={`translate(${cursorX}, ${cursorY})`}>
        {/* Outer Rotating Reticle Ring */}
        <circle
          r="22"
          fill="none"
          stroke={!isPhase1 && (p2State === 'draw_mistake' || p2State === 'hold_mistake') ? '#EF4444' : '#F4D58D'}
          strokeWidth="2"
          strokeDasharray="8 6"
          filter={!isPhase1 && (p2State === 'draw_mistake' || p2State === 'hold_mistake') ? 'url(#guideGlowRed)' : 'url(#guideGlowGold)'}
          style={{ animation: 'spinClockwise 4s linear infinite' }}
        />
        {/* Inner Bracket Ring */}
        <circle
          r="14"
          fill="rgba(244, 213, 141, 0.15)"
          stroke={!isPhase1 && (p2State === 'draw_mistake' || p2State === 'hold_mistake') ? '#FCA5A5' : '#00F0FF'}
          strokeWidth="1.5"
          filter="url(#guideGlowCyan)"
        />
        {/* Central Wand Spark */}
        <circle r="4" fill="#FFFFFF" filter="url(#guideGlowCyan)" />

        {/* Floating Instruction Tooltip Badge attached to Wand */}
        <g transform="translate(0, -32)">
          <rect
            x="-95"
            y="-12"
            width="190"
            height="24"
            rx="12"
            fill="rgba(11, 15, 28, 0.9)"
            stroke={isPhase1 ? '#38BDF8' : (p2State === 'draw_mistake' || p2State === 'hold_mistake' ? '#EF4444' : '#4ADE80')}
            strokeWidth="1.5"
            filter="drop-shadow(0 0 10px rgba(0,0,0,0.8))"
          />
          <text
            x="0"
            y="4"
            fill={isPhase1 ? '#E0F2FE' : (p2State === 'draw_mistake' || p2State === 'hold_mistake' ? '#FEE2E2' : '#DCFCE7')}
            fontSize="10"
            fontWeight="900"
            textAnchor="middle"
            letterSpacing="0.8px"
          >
            {isPhase1
              ? '1. TRACE STAR LINK'
              : p2State === 'draw_mistake' || p2State === 'hold_mistake'
                ? 'WRONG STAR CONNECTED'
                : p2State === 'backtrack'
                  ? '2. BACKTRACK TO UNDO'
                  : 'MISTAKE CLEARED'}
          </text>
        </g>
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
        @keyframes reverseDashFlow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 32; }
        }
        @keyframes undoPillPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes pulseRing {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 0.9; transform: scale(1.1); }
        }
        @keyframes burstOut {
          0% { transform: scale(0.4); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </svg>
  );
}
