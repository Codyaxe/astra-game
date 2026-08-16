/**
 * StarfieldCanvas.jsx — High-Performance 2D Canvas Starfield & Transition Engine
 * 
 * Game Flow States:
 * - 'idle': State 0 - Constant 3D forward cruise motion (slow speed, no streaks, infinite loop).
 * - 'warping': State 1 - Hyperspace warp effect running continuously in motion (high speed, streaks).
 * - 'settled': State 2 - Decelerates smoothly to rest from active warp position. Zero star replacement/teleportation.
 * - 'turning': Parallax viewport turn.
 * - 'sustained_warp': (WIN) Resumes continuous hyperspace warp.
 * - 'impact': (FAIL) Right Peripheral Viewport Collision: Jagged glass fracture crack lines + hull sparks -> HARD FREEZE.
 */

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';

const STAR_COUNT = 900;
const EMBER_COUNT = 75;

// Color Palette
const COLORS = {
  bgNavy: '#030712',
  bgDarkSpace: '#050814',
  starWhite: '#F1F0EC',
  starGold: '#F4D58D',
  starBlue: '#70A1FF',
  impactFlash: 'rgba(244, 213, 141, 0.45)', // Warm safe gold/orange flash
  vignetteRed: 'rgba(229, 72, 77, 0.35)',  // Emergency hull vignette
};

const StarfieldCanvas = forwardRef(function StarfieldCanvas(
  {
    state = 'idle', // 'idle' | 'warping' | 'settled' | 'turning' | 'sustained_warp' | 'impact' | 'frozen'
    turnDirection = 0, // -1 for turn left, +1 for turn right
    onImpactComplete,
    onSettledComplete,
  },
  ref
) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const starsRef = useRef([]);
  const embersRef = useRef([]);
  const crackLinesRef = useRef([]); // Jagged viewport glass fracture lines

  // Animation state references
  const currentStateRef = useRef(state);
  const turnDirRef = useRef(turnDirection);
  const isFrozenRef = useRef(false);
  const impactTimeRef = useRef(null);
  const warpSpeedRef = useRef(
    state === 'warping' || state === 'sustained_warp'
      ? 28.0
      : state === 'idle'
      ? 1.2
      : 0.0
  );

  // Shake offset state
  const shakeRef = useRef({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    freeze: () => {
      isFrozenRef.current = true;
    },
    unfreeze: () => {
      isFrozenRef.current = false;
    },
  }));

  const curFocalRef = useRef({ x: 0, y: 0 });
  const winStartTimeRef = useRef(null);
  const warpStartTimeRef = useRef(null); // Tracks when warping acceleration began
  const phase2TeleportedRef = useRef(false);

  // Sync props to refs
  useEffect(() => {
    const prevState = currentStateRef.current;
    currentStateRef.current = state;

    if (state === 'sustained_warp' && prevState !== 'sustained_warp') {
      winStartTimeRef.current = Date.now();
      phase2TeleportedRef.current = false;
      warpSpeedRef.current = 0.5; // Start slow for gradual ramp-up
    } else if (state !== 'sustained_warp') {
      winStartTimeRef.current = null;
      phase2TeleportedRef.current = false;
    }

    if (state === 'warping' && prevState !== 'warping') {
      warpSpeedRef.current = 1.2;          // Start from idle cruise — cubic ease-in begins now
      warpStartTimeRef.current = Date.now(); // Record acceleration start time
      phase2TeleportedRef.current = false;
    } else if (state === 'idle' && prevState !== 'idle') {
      warpSpeedRef.current = 1.2;
    }

    if (state === 'frozen') {
      isFrozenRef.current = true;
    } else {
      isFrozenRef.current = false;
    }

    // Reset impact cracks, embers, timing, and frozen status when leaving impact/frozen state
    if (state !== 'impact' && state !== 'frozen') {
      isFrozenRef.current = false;
      impactTimeRef.current = null;
      crackLinesRef.current = [];
      embersRef.current = [];
    }

    if (state === 'impact' && !impactTimeRef.current) {
      impactTimeRef.current = Date.now();
      const canvas = canvasRef.current;
      if (canvas) {
        const w = canvas.width;
        const h = canvas.height;

        // Right Peripheral Impact Point
        const hitX = w * 0.86;
        const hitY = h * 0.35;

        // 1. Generate Right Peripheral Hull Sparks & Debris
        embersRef.current = Array.from({ length: EMBER_COUNT }, () => {
          const angle = Math.PI + (Math.random() - 0.5) * 1.6;
          const speed = 4 + Math.random() * 16;
          return {
            x: hitX + (Math.random() - 0.5) * 40,
            y: hitY + (Math.random() - 0.5) * 40,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1.8 + Math.random() * 3.8,
            alpha: 1.0,
            color: Math.random() > 0.4 ? COLORS.starGold : '#E5484D',
          };
        });

        // 2. Generate Sharp Jagged Viewport Glass Cracks (NO Spiderwebs)
        const origins = [
          { x: w * 0.86, y: h * 0.35, count: 6 }, // Right Peripheral Impact Point
          { x: w * 0.74, y: h * 0.14, count: 4 }, // Upper Right Glass
          { x: w * 0.82, y: h * 0.76, count: 4 }, // Lower Right Hull Frame
          { x: w * 0.48, y: h * 0.05, count: 3 }, // Canopy Top Crack
        ];

        const lines = [];
        origins.forEach((orig) => {
          for (let c = 0; c < orig.count; c++) {
            const baseAngle = Math.random() * Math.PI * 2;
            let currX = orig.x;
            let currY = orig.y;
            const numSegs = 4 + Math.floor(Math.random() * 3);

            for (let i = 0; i < numSegs; i++) {
              const segAngle = baseAngle + (Math.random() - 0.5) * 0.6;
              const length = 30 + Math.random() * 70;
              const nextX = currX + Math.cos(segAngle) * length;
              const nextY = currY + Math.sin(segAngle) * length;
              lines.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
              currX = nextX;
              currY = nextY;
            }
          }
        });

        crackLinesRef.current = lines;
      }
    } else if (state !== 'impact' && state !== 'frozen') {
      impactTimeRef.current = null;
      crackLinesRef.current = [];
    }
  }, [state]);

  useEffect(() => {
    turnDirRef.current = turnDirection;
  }, [turnDirection]);

  // Init Stars with wide 3D spatial frustum (Fills 100% of viewport during camera tilts)
  const initStars = useCallback((w, h) => {
    const maxDepth = Math.max(w, h);
    starsRef.current = Array.from({ length: STAR_COUNT }, () => {
      const z = 10 + Math.random() * (maxDepth - 10);
      return {
        x: (Math.random() - 0.5) * w * 4.8,
        y: (Math.random() - 0.5) * h * 4.8,
        z: z,
        pz: z + 20,
        color:
          Math.random() > 0.85
            ? COLORS.starGold
            : Math.random() > 0.70
            ? COLORS.starBlue
            : COLORS.starWhite,
        baseSize: 0.4 + Math.random() * 0.9,
      };
    });
  }, []);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function handleResize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (starsRef.current.length === 0) {
        initStars(canvas.width, canvas.height);
      }
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    const cx = () => canvas.width / 2;
    const cy = () => canvas.height / 2;

    function render() {
      if (isFrozenRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const curState = currentStateRef.current;
      const maxDepth = Math.max(w, h);
      const focalLength = 340;

      // ---- 1. Handle Ship Viewport Shake & Flash during Fail Impact ----
      let flashAlpha = 0;
      let shakeX = 0;
      let shakeY = 0;

      if (curState === 'impact' && impactTimeRef.current) {
        const elapsed = Date.now() - impactTimeRef.current;
        const duration = 2800; // 2.8 seconds matching eye-blink fade timing

        if (elapsed < duration) {
          flashAlpha = Math.max(0, 1 - elapsed / 400);
          const shakeMag = Math.max(0, (1 - elapsed / duration) * 26);
          shakeX = (Math.random() - 0.7) * shakeMag;
          shakeY = (Math.random() - 0.5) * shakeMag;
        } else {
          isFrozenRef.current = true;
          currentStateRef.current = 'frozen';
          crackLinesRef.current = [];
          embersRef.current = [];
          onImpactComplete?.();
        }
      }

      shakeRef.current = { x: shakeX, y: shakeY };

      // ---- 2. Draw Deep Space Background ----
      ctx.save();
      ctx.translate(shakeX, shakeY);

      const bgGradient = ctx.createRadialGradient(cx(), cy(), 50, cx(), cy(), Math.max(w, h));
      bgGradient.addColorStop(0, COLORS.bgDarkSpace);
      bgGradient.addColorStop(1, COLORS.bgNavy);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, w, h);

      // ---- 3. Warp Speed & Focal Dynamics ----
      let targetFocalX = cx();
      let targetFocalY = cy();

      if (curState === 'sustained_warp') {
        if (!winStartTimeRef.current) winStartTimeRef.current = Date.now();
        const elapsed = (Date.now() - winStartTimeRef.current) / 3600;
        const p = Math.min(1.0, Math.max(0, elapsed));

        if (p < 0.35) {
          // PHASE 1: Bank Turn (0.0s - 1.25s) — Stars & Constellation sweep up-left in bank turn
          const turnP = Math.sin((p / 0.35) * (Math.PI / 2));
          warpSpeedRef.current = 1.2 + turnP * 1.5;
          targetFocalX = cx() - turnP * 320;
          targetFocalY = cy() - turnP * 420;
        } else {
          // PHASE 2: Straight Forward Hyperspace Warp — Teleport radial instantly to CENTER with 2D position lock!
          const fwdP = (p - 0.35) / 0.65;
          const cubicFwd = Math.pow(fwdP, 3);
          warpSpeedRef.current = 2.7 + cubicFwd * 33.3; // Ramps to 36.0 full hyperspace streaks!
          targetFocalX = cx();
          targetFocalY = cy();

          if (!phase2TeleportedRef.current) {
            phase2TeleportedRef.current = true;
            const shiftX = curFocalRef.current.x - cx();
            const shiftY = curFocalRef.current.y - cy();

            // Instant Teleport Radial to Center
            curFocalRef.current.x = cx();
            curFocalRef.current.y = cy();

            // Mathematical 2D Position Lock: Adjust star (x,y) so screen positions (px,py) remain 100% invariant!
            for (let i = 0; i < starsRef.current.length; i++) {
              const star = starsRef.current[i];
              if (star.z > 0) {
                const k = focalLength / star.z;
                star.x += shiftX / k;
                star.y += shiftY / k;
              }
            }
          } else {
            curFocalRef.current.x = cx();
            curFocalRef.current.y = cy();
          }
        }
      } else if (curState === 'warping') {
        // Cubic ease-in acceleration: starts sluggish, then surges into full hyperdrive over 4.5s
        const WARP_RAMP_MS = 1000;
        const elapsed = warpStartTimeRef.current ? Date.now() - warpStartTimeRef.current : 0;
        const t = Math.min(1.0, elapsed / WARP_RAMP_MS);
        const cubicT = t * t * t; // Ease-in cubic: near-zero at start, explosive at end
        warpSpeedRef.current = 1.2 + cubicT * 32.0; // 1.2 idle cruise → 33.2 full hyperspace streaks
      } else if (curState === 'idle') {
        // Deep space cruise mode (1.2 speed before warp)
        if (warpSpeedRef.current < 1.2) {
          warpSpeedRef.current = Math.min(1.2, warpSpeedRef.current + 0.05);
        } else if (warpSpeedRef.current > 1.2) {
          warpSpeedRef.current *= 0.91;
        } else {
          warpSpeedRef.current = 1.2;
        }
      } else if (curState === 'settled') {
        // Arrived at target constellation: decelerates smoothly to rest (0.0 speed)
        const prevSpeed = warpSpeedRef.current;
        warpSpeedRef.current *= 0.91;
        if (warpSpeedRef.current < 0.05) {
          warpSpeedRef.current = 0.0;
          if (prevSpeed >= 0.05) {
            onSettledComplete?.();
          }
        }
      } else if (curState === 'frozen') {
        warpSpeedRef.current = 0.0;
      } else {
        warpSpeedRef.current *= 0.91;
        if (warpSpeedRef.current < 0.05) warpSpeedRef.current = 0.0;
      }

      // Smooth 60 FPS LERP transition for radial focal point (no snapping!)
      if (!curFocalRef.current.x) {
        curFocalRef.current.x = targetFocalX;
        curFocalRef.current.y = targetFocalY;
      } else {
        curFocalRef.current.x += (targetFocalX - curFocalRef.current.x) * 0.08;
        curFocalRef.current.y += (targetFocalY - curFocalRef.current.y) * 0.08;
      }

      const focalX = curFocalRef.current.x;
      const focalY = curFocalRef.current.y;

      const speed = warpSpeedRef.current;
      const turnDir = turnDirRef.current;
      const stars = starsRef.current;

      // ---- 4. Render Persisted 3D Stars ----
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        if (speed > 0) {
          star.pz = star.z;
          star.z -= speed * 1.4;

          if (star.z <= 15) {
            // ALWAYS recycle staggered to deep space to keep 3D depth 100% continuous without ring waves!
            const newZ = maxDepth + Math.random() * (maxDepth * 0.5);
            star.z = newZ;
            star.pz = newZ + speed * 1.4;
            star.x = (Math.random() - 0.5) * w * 4.8;
            star.y = (Math.random() - 0.5) * h * 4.8;
          }
        } else {
          star.pz = star.z;
        }

        if (turnDir !== 0 && star.z > 0) {
          const turnAmount = turnDir * (star.z / focalLength) * 3.5;
          star.x += turnAmount;

          if (star.x > w * 2) star.x = -w * 2;
          if (star.x < -w * 2) star.x = w * 2;
        }

        if (star.z > 0) {
          const k = focalLength / star.z;
          const px = star.x * k + focalX;
          const py = star.y * k + focalY;

          const pk = focalLength / star.pz;
          const prevPx = star.x * pk + focalX;
          const prevPy = star.y * pk + focalY;

          if (px >= -150 && px <= w + 150 && py >= -150 && py <= h + 150) {
            const depthRatio = Math.max(0, 1 - star.z / maxDepth);
            const starAlpha = Math.min(1.0, depthRatio * 1.3 + 0.2);

            if (speed > 4.0 && curState !== 'idle') {
              ctx.beginPath();
              ctx.moveTo(prevPx, prevPy);
              ctx.lineTo(px, py);
              ctx.strokeStyle = star.color;
              ctx.lineWidth = Math.min(4, depthRatio * 3 + 0.8);
              ctx.globalAlpha = starAlpha;
              ctx.stroke();
            } else {
              const starRadius = Math.max(0.8, star.baseSize * (1 + depthRatio * 0.8));
              ctx.beginPath();
              ctx.arc(px, py, starRadius, 0, Math.PI * 2);
              ctx.fillStyle = star.color;
              ctx.globalAlpha = starAlpha;
              ctx.fill();
            }
          }
        }
      }

      ctx.globalAlpha = 1.0;

      // ---- 5. Jagged Viewport Glass Cracks & Right Peripheral Sparks ----
      if (curState === 'impact' || curState === 'frozen') {
        // A. Render Sharp Jagged Viewport Glass Fractures
        const crackLines = crackLinesRef.current;
        ctx.save();
        ctx.strokeStyle = 'rgba(241, 240, 236, 0.95)';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#F4D58D';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        for (let i = 0; i < crackLines.length; i++) {
          const line = crackLines[i];
          ctx.moveTo(line.x1, line.y1);
          ctx.lineTo(line.x2, line.y2);
        }
        ctx.stroke();
        ctx.restore();

        // B. Render Right Peripheral Hull Sparks
        const embers = embersRef.current;
        for (let i = 0; i < embers.length; i++) {
          const e = embers[i];
          if (curState === 'impact') {
            e.x += e.vx;
            e.y += e.vy;
            e.vx *= 0.95;
            e.vy *= 0.95;
            e.alpha = Math.max(0, e.alpha - 0.012);
          }

          if (e.alpha > 0) {
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fillStyle = e.color;
            ctx.globalAlpha = e.alpha;
            ctx.fill();
          }
        }

        ctx.globalAlpha = 1.0;

        // C. Ship Viewport Flash
        if (flashAlpha > 0) {
          ctx.fillStyle = COLORS.impactFlash;
          ctx.globalAlpha = flashAlpha;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1.0;
        }

        // D. Emergency Red Hull Vignette
        const vignetteGrad = ctx.createRadialGradient(cx(), cy(), Math.min(w, h) * 0.35, cx(), cy(), Math.max(w, h));
        vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGrad.addColorStop(1, COLORS.vignetteRed);
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [initStars, onImpactComplete, onSettledComplete]);

  return (
    <canvas
      ref={canvasRef}
      className={`starfield-canvas ${state === 'frozen' ? 'is-frozen' : ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
});

export default StarfieldCanvas;
