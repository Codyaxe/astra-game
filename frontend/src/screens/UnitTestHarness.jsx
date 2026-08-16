/**
 * UnitTestHarness.jsx — Visual Component Test Harness
 * 
 * Flow requested by user:
 * 0. State 0: Idle Cruise (Constant slow forward 3D motion, NO streaks, constellation hidden).
 * 1. Warp-In State (Continuous hyperspace warp streak loop, constellation hidden).
 * 2. Initialize Game State (Decelerates active stars to rest; constellation zooms in from 3D focal point).
 * 3. Trigger Win (Continuous warp + 3.6s 3D constellation fly-by turn -> Delayed Score box overlay).
 * 4. Trigger Fail (Impact flash/shake/embers -> Long Outer Wilds eye-blink fade OVER HUD -> Hard freeze -> Score box).
 */

import { useState, useEffect, useRef } from 'react';
import StarfieldCanvas from '../components/starlink/StarfieldCanvas';
import ConstellationLayer from '../components/starlink/ConstellationLayer';
import WandCursor from '../components/starlink/WandCursor';
import ShipCockpitViewport from '../components/starlink/ShipCockpitViewport';
import HostTimer from '../components/starlink/HostTimer';
import ScoreOverlay from '../components/starlink/ScoreOverlay';
import EyelidBlinkOverlay from '../components/starlink/EyelidBlinkOverlay';
import {
  PLACEHOLDER_STARS,
  PLACEHOLDER_CONNECTIONS,
  PLACEHOLDER_WAND_POINTER,
  PLACEHOLDER_HOST_TIMER,
} from '../mock/placeholders';

export default function UnitTestHarness({ onExit }) {
  // Game flow step: 'idle' | 'warp_in' | 'ingame_settling' | 'ingame_ready' | 'win_flyby' | 'win_ready' | 'fail_impact' | 'fail_frozen'
  const [step, setStep] = useState('idle');
  const [turnDir, setTurnDir] = useState(0);
  const [arrivalScale, setArrivalScale] = useState(1);

  // Win Fly-by Animation State (constellation expands past camera & turns up-left)
  const [winFlybyProgress, setWinFlybyProgress] = useState(0);

  const starfieldRef = useRef(null);

  // Animate 3D Constellation Arrival Scale from 0.25 to 1.0 during settling
  useEffect(() => {
    if (step === 'ingame_settling') {
      setArrivalScale(0.25);
      let start = null;
      let animId;

      function animateArrival(timestamp) {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const duration = 1200; // 1.2s arrival zoom
        const progress = Math.min(1.0, elapsed / duration);

        const easedScale = 0.25 + (1.0 - 0.25) * (1 - Math.pow(1 - progress, 3));
        setArrivalScale(easedScale);

        if (progress < 1.0) {
          animId = requestAnimationFrame(animateArrival);
        } else {
          setStep('ingame_ready');
        }
      }

      animId = requestAnimationFrame(animateArrival);

      return () => {
        if (animId) cancelAnimationFrame(animId);
      };
    } else if (step === 'ingame_ready' || step === 'fail_impact' || step === 'fail_frozen') {
      setArrivalScale(1.0);
    } else {
      setArrivalScale(0.25);
    }
  }, [step]);

  // Animate 3D Constellation Fly-By & Turn during Win transition (3.6s delay before Score Box)
  useEffect(() => {
    if (step === 'win_flyby') {
      setWinFlybyProgress(0);
      let start = null;
      let animId;

      function animateWinFlyby(timestamp) {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const duration = 3600; // 3.6s fly-by acceleration delay
        const progress = Math.min(1.0, elapsed / duration);

        setWinFlybyProgress(progress);

        if (progress < 1.0) {
          animId = requestAnimationFrame(animateWinFlyby);
        } else {
          setStep('win_ready'); // Delayed mount of Score Overlay Box
        }
      }

      animId = requestAnimationFrame(animateWinFlyby);

      return () => {
        if (animId) cancelAnimationFrame(animId);
      };
    } else if (step === 'win_ready') {
      setWinFlybyProgress(1.0);
    } else {
      setWinFlybyProgress(0);
    }
  }, [step]);

  // Map step to background canvas state
  let bgState = 'idle';
  let showConstellation = false;
  let showScore = false;
  let isWin = true;
  let score = 95;

  switch (step) {
    case 'idle':
      bgState = 'idle';
      showConstellation = false;
      showScore = false;
      break;

    case 'warp_in':
      bgState = 'warping';
      showConstellation = false;
      showScore = false;
      break;

    case 'ingame_settling':
    case 'ingame_ready':
      bgState = 'settled';
      showConstellation = true;
      showScore = false;
      break;

    case 'win_flyby':
      bgState = 'sustained_warp';
      showConstellation = true;
      showScore = false; // Delayed during fly-by acceleration
      isWin = true;
      score = 98;
      break;

    case 'win_ready':
      bgState = 'sustained_warp';
      showConstellation = false; // Constellation has flown past camera
      showScore = true; // Score Overlay mounts after 3.6s delay
      isWin = true;
      score = 98;
      break;

    case 'fail_impact':
      bgState = 'impact';
      showConstellation = true;
      showScore = false;
      isWin = false;
      score = 38;
      break;

    case 'fail_frozen':
      bgState = 'frozen';
      showConstellation = true;
      showScore = true;
      isWin = false;
      score = 38;
      break;

    default:
      bgState = 'idle';
  }

  const handleImpactComplete = () => {
    if (step === 'fail_impact') {
      starfieldRef.current?.freeze();
      setStep('fail_frozen');
    }
  };

  // 2-Phase Win Transition (Phase 1: Turn & Drift, Phase 2: Forward Warp Acceleration)
  const isWinStep = step === 'win_flyby' || step === 'win_ready';
  const p = winFlybyProgress;
  
  let winScale = arrivalScale;
  let winOpacity = showConstellation ? 1 : 0;
  let winTurnX = 0;
  let winTurnY = 0;

  if (isWinStep) {
    if (p < 0.35) {
      // Phase 1: Bank Turn (Constellation & Stars sweep up-left together as camera rotates)
      const turnP = Math.sin((p / 0.35) * (Math.PI / 2));
      winScale = 1.0 + turnP * 1.8;
      winOpacity = 1.0 - turnP * 0.6;
      winTurnX = -turnP * 580;
      winTurnY = -turnP * 720;
    } else {
      // Phase 2: Straight Forward Hyperspace Acceleration (Radial point at CENTER, constellation cleared off-screen)
      const fwdP = (p - 0.35) / 0.65;
      const cubicFwd = Math.pow(fwdP, 3);
      winScale = 2.8 + cubicFwd * 3.2;
      winOpacity = Math.max(0, 0.4 - fwdP * 0.8);
      winTurnX = -580 - fwdP * 300;
      winTurnY = -720 - fwdP * 300;
    }
  }

  return (
    <div
      className="unit-test-harness"
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#030712',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 1. Starfield Canvas Background Engine (zIndex: 1) */}
      <StarfieldCanvas
        ref={starfieldRef}
        state={bgState}
        turnDirection={turnDir}
        onImpactComplete={handleImpactComplete}
      />

      {/* 2. Constellation Star Nodes & Lines (zIndex: 2) — 3D Fly-By Expansion Past Camera */}
      <ConstellationLayer
        stars={PLACEHOLDER_STARS}
        connectedSegments={
          isWinStep
            ? [
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 5 },
              ]
            : PLACEHOLDER_CONNECTIONS
        }
        wandPointer={PLACEHOLDER_WAND_POINTER}
        activeStarId={3}
        opacity={showConstellation ? (step === 'ingame_settling' ? arrivalScale : winOpacity) : 0}
        scale={winScale}
        turnShift={turnDir * 40}
        winTurnX={winTurnX}
        winTurnY={winTurnY}
      />

      {/* 3. Wand Cursor (zIndex: 10) */}
      {showConstellation && !isWinStep && <WandCursor pointer={PLACEHOLDER_WAND_POINTER} />}

      {/* 4. Ship Cockpit Viewport Canopy (zIndex: 15 — CONSTANT SHIP OVERLAY behind HUD & Blink) */}
      <ShipCockpitViewport />

      {/* 5. Host Timer (zIndex: 20) */}
      {showConstellation && !showScore && !isWinStep && (
        <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 20 }}>
          <HostTimer
            startTime={PLACEHOLDER_HOST_TIMER.startTime}
            duration={PLACEHOLDER_HOST_TIMER.duration}
          />
        </div>
      )}

      {/* 6. Top-level Eyelid Blink Overlay (zIndex: 40 — ABOVE HUD & Cockpit Viewport) */}
      <EyelidBlinkOverlay
        active={step === 'fail_impact' || step === 'fail_frozen'}
        duration={2800}
      />

      {/* 7. Score Overlay Box (zIndex: 50 — Mounts AFTER 3.6s Fly-By Acceleration Delay) */}
      {showScore && (
        <ScoreOverlay
          score={score}
          isWin={isWin}
          onRestart={() => setStep('idle')}
        />
      )}

      {/* 8. Game Flow Test Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          display: 'flex',
          gap: '8px',
          padding: '10px 20px',
          background: 'rgba(5, 8, 20, 0.92)',
          border: '2px solid #F4D58D',
          borderRadius: '30px',
          boxShadow: '0 0 24px rgba(244, 213, 141, 0.35)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span
          style={{
            color: '#F4D58D',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            alignSelf: 'center',
            marginRight: '6px',
            letterSpacing: '1px',
          }}
        >
          🎮 GAME FLOW CONTROLS:
        </span>

        {/* Step 0: State 0 Idle Cruise */}
        <button
          onClick={() => setStep('idle')}
          style={stepBtnStyle(step === 'idle')}
        >
          🌌 0. Idle Cruise
        </button>

        {/* Step 1: Warp-In */}
        <button
          onClick={() => setStep('warp_in')}
          style={stepBtnStyle(step === 'warp_in')}
        >
          🚀 1. Warp-In (Fast Streaks)
        </button>

        {/* Step 2: Initialize Game State */}
        <button
          onClick={() => setStep('ingame_settling')}
          style={stepBtnStyle(step === 'ingame_settling' || step === 'ingame_ready')}
        >
          🎮 2. Initialize Game State
        </button>

        {/* Step 3: Trigger Win */}
        <button
          onClick={() => setStep('win_flyby')}
          style={stepBtnStyle(step === 'win_flyby' || step === 'win_ready')}
        >
          🏆 3. Trigger Win (Fly-By Acceleration)
        </button>

        {/* Step 4: Trigger Fail */}
        <button
          onClick={() => setStep('fail_impact')}
          style={stepBtnStyle(step === 'fail_impact' || step === 'fail_frozen')}
        >
          💥 4. Trigger Fail
        </button>

        {/* Parallax Turn Controls (Active in Game State) */}
        {showConstellation && !showScore && (
          <>
            <button
              onMouseDown={() => setTurnDir(-1)}
              onMouseUp={() => setTurnDir(0)}
              style={stepBtnStyle(turnDir === -1)}
            >
              ⮌ Turn Left
            </button>
            <button
              onMouseDown={() => setTurnDir(1)}
              onMouseUp={() => setTurnDir(0)}
              style={stepBtnStyle(turnDir === 1)}
            >
              Turn Right ⮞
            </button>
          </>
        )}

        {onExit && (
          <button onClick={onExit} style={{ ...stepBtnStyle(false), borderColor: '#E5484D', color: '#E5484D' }}>
            ✖ Exit
          </button>
        )}
      </div>
    </div>
  );
}

function stepBtnStyle(isActive) {
  return {
    background: isActive ? '#F4D58D' : 'rgba(255, 255, 255, 0.08)',
    border: `1px solid ${isActive ? '#F4D58D' : 'rgba(255, 255, 255, 0.25)'}`,
    borderRadius: '18px',
    color: isActive ? '#050814' : '#F1F0EC',
    padding: '6px 14px',
    fontSize: '0.82rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };
}
