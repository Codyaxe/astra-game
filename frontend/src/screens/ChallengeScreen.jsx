/**
 * ChallengeScreen.jsx — Constellation Tracing Gameplay Screen
 *
 * Implements:
 * 1. Linked-list struct sequence validation (head -> next -> next ...)
 * 2. Magnetic snapping with extended hitboxes
 * 3. Forward tilt to draw, untilt to complete/click connection
 * 4. Left/Right tilt to reset lines
 * 5. Circle motion to force exit immediately
 * 6. Shake Up/Down to recalibrate wand tracking
 * 7. Timer countdown with disqualification on expiry
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ConstellationCanvas from '../components/ConstellationCanvas';
import ConstellationLayer from '../components/starlink/ConstellationLayer';
import WandCursor from '../components/starlink/WandCursor';
import useMouseWandAdapter from '../hooks/useMouseWandAdapter';
import HUD from '../components/HUD';
import { useWandGestures } from '../hooks/useWandGestures';
import { useGameTimer } from '../hooks/useGameTimer';
import { ConstellationLinkedList } from '../game/linkedListConstellation';
import { getMagneticSnap, calculateDistance, toScreenNorm } from '../game/snapping';
import { playSfx } from '../utils/audio';
import { startSession, submitAttempt } from '../services/api';
import { PLACEHOLDER_STARS } from '../mock/placeholders';
import SubtitleOverlay from '../components/dialogue/SubtitleOverlay';
import useDialogueController from '../hooks/useDialogueController';
import { DIALOGUE_CONFIG } from '../config/dialogueConfig';

export default function ChallengeScreen({
  player,
  constellationData,
  attemptNumber = 1,
  controlMode = 'hybrid',
  showCamPip = false,
  onWinStart,
  onComplete,
  onForceExit,
  onDisqualified,
}) {
  const [sessionId, setSessionId] = useState(null);
  const [completedConnections, setCompletedConnections] = useState([]); // [{ from, to }]
  const [activeNode, setActiveNode] = useState(null);
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });

  // Telemetry
  const [wrongConnections, setWrongConnections] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [recalibrationCount, setRecalibrationCount] = useState(0);
  const wandTravelDistRef = useRef(0);
  const prevPointerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const hasEndedRef = useRef(false);
  const { activeSubtitle, playLine, playSequence, stopDialogue } = useDialogueController();
  const hasPlayed20sRef = useRef(false);
  const hasPlayed10sRef = useRef(false);

  // Instantiate linked list model
  const constellationList = useMemo(() => {
    return constellationData ? new ConstellationLinkedList(constellationData) : null;
  }, [constellationData]);

  // Timer expiration handler (forward declared via ref to avoid circular dependency)
  const timerExpireRef = useRef(null);
  const timeLimit = constellationList?.timeLimitSec || 30;
  const { timeLeft, start: startTimer, stop: stopTimer } = useGameTimer(timeLimit, (elapsed) => {
    if (timerExpireRef.current) timerExpireRef.current(elapsed);
  });

  // Win Fly-by 3D Expansion & Turn Animation State (3.6s duration)
  const [winFlybyProgress, setWinFlybyProgress] = useState(null);

  // Stage Arrival Entry Transition (0.0 to 1.0 over 800ms)
  const [entryProgress, setEntryProgress] = useState(0);

  useEffect(() => {
    setEntryProgress(0);
    let start = null;
    let animId = null;
    function animateEntry(timestamp) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1.0, elapsed / 800);
      setEntryProgress(progress);
      if (progress < 1.0) {
        animId = requestAnimationFrame(animateEntry);
      }
    }
    animId = requestAnimationFrame(animateEntry);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [constellationData?.id]);

  const startWinDialogue = useCallback((winResult) => {
    console.log('%c[ASTRA DIAGNOSTIC] 🎙️ startWinDialogue called with result:', 'color: #38bdf8; font-weight: bold;', winResult);

    // Timeout safety fallback: guarantee win screen transitions even if dialogue audio stalls
    let safetyFired = false;
    const safetyTimer = setTimeout(() => {
      if (!safetyFired) {
        safetyFired = true;
        console.log('%c[ASTRA DIAGNOSTIC] ⚡ Safety Timer triggered -> Advancing stage!', 'color: #facc15; font-weight: bold;');
        onComplete?.(winResult);
      }
    }, 7000);

    playSequence(
      DIALOGUE_CONFIG.phaseEWin,
      () => {
        if (!safetyFired) {
          safetyFired = true;
          clearTimeout(safetyTimer);
          console.log('%c[ASTRA DIAGNOSTIC] 🏁 Phase E Dialogue finished -> Advancing stage!', 'color: #4ade80; font-weight: bold;');
          onComplete?.(winResult);
        }
      },
      (line) => {
        console.log('%c[ASTRA DIAGNOSTIC] 🗣️ Playing Win Dialogue Line:', 'color: #a78bfa;', line.id, line.text);
        if (line.triggers3DTurn) {
          console.log('%c[ASTRA DIAGNOSTIC] 🌀 Line triggers 3D Constellation Turn Animation!', 'color: #fbbf24; font-weight: bold;');
          onWinStart?.();
          setWinFlybyProgress(0);
          let start = null;
          function animateWinFlyby(timestamp) {
            if (!start) start = timestamp;
            const elapsed = timestamp - start;
            const duration = 3600;
            const progress = Math.min(1.0, elapsed / duration);
            setWinFlybyProgress(progress);
            if (progress < 1.0) {
              requestAnimationFrame(animateWinFlyby);
            }
          }
          requestAnimationFrame(animateWinFlyby);
        }
      }
    );
  }, [playSequence, onWinStart, onComplete]);

  const starNodes = useMemo(() => {
    const listStars = constellationList?.getAllStarNodes() || [];
    if (listStars.length > 0) return listStars.map((s) => ({ ...s, isFake: false }));
    const raw = constellationData?.star_nodes || constellationData?.stars || PLACEHOLDER_STARS;
    return raw.map((s) => ({ ...s, isFake: false }));
  }, [constellationList, constellationData]);

  const fakeNodes = useMemo(() => {
    const listFakes = constellationList?.getAllFakeNodes() || [];
    if (listFakes.length > 0) return listFakes.map((s) => ({ ...s, isFake: true }));
    const raw = constellationData?.fake_nodes || constellationData?.fake_stars || [];
    return raw.map((s) => ({ ...s, isFake: true }));
  }, [constellationList, constellationData]);

  // Target valid connection guides for testing visualization & logic validation
  const validGuideSegments = useMemo(() => {
    const segments = [];
    starNodes.forEach((node) => {
      if (node.next_node_id !== null && node.next_node_id !== undefined) {
        segments.push({ from: node.id, to: node.next_node_id });
      }
    });
    if (segments.length === 0 && constellationData?.connections) {
      return constellationData.connections;
    }
    return segments;
  }, [starNodes, constellationData]);

  // Check if edge is valid in either direction (bidirectional: A -> B or B -> A)
  const isValidEdge = useCallback((fromId, toId) => {
    return validGuideSegments.some(
      (edge) =>
        (edge.from === fromId && edge.to === toId) ||
        (edge.from === toId && edge.to === fromId)
    );
  }, [validGuideSegments]);

  /**
   * LOGIC LAYER — Snap decision handler.
   * Receives raw drag events from the input adapter (mouse / wand) and decides validity.
   * In production: this decision comes from the backend via WebSocket (isSnap: true/false).
   * Validates bidirectional edge (A -> B or B -> A) against constellation target.
   */
  const [snapEffect, setSnapEffect] = useState(null);

  const handleDragComplete = useCallback(({ fromStarId, toStarId }) => {
    if (fromStarId != null && toStarId != null) {
      // 1. Check if edge is valid in either direction (bidirectional)
      const valid = isValidEdge(fromStarId, toStarId);

      // 2. Check if already connected
      const exists = completedConnections.some(
        (s) =>
          (s.from === fromStarId && s.to === toStarId) ||
          (s.from === toStarId && s.to === fromStarId)
      );

      if (valid && !exists) {
        // SUCCESS SNAP (isSnap = true)
        const result = { success: true, from: fromStarId, to: toStarId, timestamp: Date.now() };
        setSnapEffect(result);
        const updatedConns = [...completedConnections, { from: fromStarId, to: toStarId }];
        setCompletedConnections(updatedConns);
        playSfx('snap');

        // Check if finished full constellation
        const requiredCount = validGuideSegments.length > 0 ? validGuideSegments.length : starNodes.length - 1;
        console.log('%c[ASTRA DIAGNOSTIC] 🔗 Snap Connection Added!', 'color: #38bdf8;', {
          from: fromStarId,
          to: toStarId,
          connectedCount: updatedConns.length,
          requiredCount,
        });

        if (updatedConns.length >= requiredCount) {
          if (hasEndedRef.current) return;
          hasEndedRef.current = true;
          setActiveNode(null);
          stopTimer();
          console.log('%c[ASTRA DIAGNOSTIC] ✨ FULL CONSTELLATION COMPLETED!', 'color: #4ade80; font-weight: bold;');

          const elapsed = Date.now() - startTimeRef.current;
          const elapsedSec = Math.round(elapsed / 100) / 10;
          const travelCm = Math.round(wandTravelDistRef.current / 10) / 10;
          const calculatedScore = Math.max(75, 100 - wrongConnections * 5);

          const winResult = {
            completed_status: 1,
            isWin: true,
            score: calculatedScore,
            telemetry: {
              time_spent_sec: elapsedSec,
              wrong_attempts: wrongConnections,
              travel_dist_cm: travelCm > 0 ? travelCm : 28.5,
            },
          };

          if (sessionId) {
            submitAttempt(sessionId, {
              time_elapsed_ms: elapsed,
              wrong_connections: wrongConnections,
              total_clicks: totalClicks + 1,
              wand_travel_dist: wandTravelDistRef.current,
              recalibration_count: recalibrationCount,
              completed_status: 1,
            })
              .then((res) => startWinDialogue({ ...winResult, ...res }))
              .catch(() => startWinDialogue(winResult));
          } else {
            startWinDialogue(winResult);
          }
        }
      } else {
        // INVALID EDGE OR ALREADY CONNECTED (isSnap = false)
        const result = { success: false, from: fromStarId, to: toStarId, timestamp: Date.now() };
        setSnapEffect(result);
        playSfx('wrong');
        setWrongConnections((prev) => prev + 1);
      }
    } else {
      // RELEASED IN EMPTY SPACE (isSnap = false)
      const result = { success: false, from: fromStarId, to: null, timestamp: Date.now() };
      setSnapEffect(result);
      playSfx('wrong');
    }
  }, [completedConnections, isValidEdge]);

  const activeNodeRef = useRef(activeNode);
  useEffect(() => {
    activeNodeRef.current = activeNode;
  }, [activeNode]);

  // Mouse-to-Wand Testing Adapter — pure input emitter, enabled only when in mouse/hybrid mode
  const { wandPointer: mouseWand, drawingPath: mouseDrawingPath } = useMouseWandAdapter({
    stars: [...starNodes, ...fakeNodes],
    enabled: controlMode === 'mouse' || controlMode === 'hybrid',
    onDragComplete: handleDragComplete,
  });

  // Initial head node setup
  useEffect(() => {
    if (constellationList) {
      const head = constellationList.getHead();
      setActiveNode(head);
      setCompletedConnections([]);
    }
  }, [constellationList]);

  // ---- 1. Gesture Callbacks ----

  // Left/Right tilt: Reset lines
  const handleResetLines = useCallback(() => {
    if (constellationList) {
      setCompletedConnections([]);
      setActiveNode(constellationList.getHead());
      playSfx('wrong');
    }
  }, [constellationList]);

  // Circle motion: Force Emergency Exit
  const handleCircleExit = useCallback(async () => {
    if (!sessionId) {
      onForceExit?.();
      return;
    }
    const elapsed = Date.now() - startTimeRef.current;
    try {
      await submitAttempt(sessionId, {
        time_elapsed_ms: elapsed,
        wrong_connections: wrongConnections,
        total_clicks: totalClicks,
        wand_travel_dist: wandTravelDistRef.current,
        recalibration_count: recalibrationCount,
        completed_status: 3, // circle force exit
      });
    } catch (e) {
      console.error(e);
    }
    onForceExit?.();
  }, [sessionId, wrongConnections, totalClicks, recalibrationCount, onForceExit]);

  // Shake: Recalibrate
  const handleRecalibrate = useCallback(() => {
    setRecalibrationCount((c) => c + 1);
  }, []);

  // Timer expiration: Disqualified (Plays Phase D dialogue lines D1 & D2 before eye blink closure)
  const handleTimerExpire = useCallback(async () => {
    if (hasEndedRef.current) {
      console.log('%c[ASTRA DIAGNOSTIC] ⏳ Timer Expired after level already finished. Ignoring.', 'color: #94a3b8;');
      return;
    }
    hasEndedRef.current = true;
    console.log('%c[ASTRA DIAGNOSTIC] ❌ Timer Expired! Starting Fail Dialogue sequence...', 'color: #f87171; font-weight: bold;');

    playSfx('timerEnd');
    const elapsed = Date.now() - startTimeRef.current;
    const travelCm = Math.round(wandTravelDistRef.current / 10) / 10;
    const failResult = {
      completed_status: 2,
      isWin: false,
      score: Math.max(15, 45 - wrongConnections * 5),
      telemetry: {
        time_spent_sec: Math.round(elapsed / 100) / 10,
        wrong_attempts: wrongConnections,
        travel_dist_cm: travelCm > 0 ? travelCm : 32.1,
      },
    };

    if (sessionId) {
      try {
        await submitAttempt(sessionId, {
          time_elapsed_ms: elapsed,
          wrong_connections: wrongConnections,
          total_clicks: totalClicks,
          wand_travel_dist: wandTravelDistRef.current,
          recalibration_count: recalibrationCount,
          completed_status: 2, // Disqualified
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Play Phase D Fail Dialogue (D1 "That's not a match..." -> D2 "Brace, brace, BRA—") -> Eye Blink / Fail
    playSequence(DIALOGUE_CONFIG.phaseDFail, () => {
      console.log('%c[ASTRA DIAGNOSTIC] 💀 Phase D Fail Dialogue finished -> Calling onDisqualified()', 'color: #f87171;');
      onDisqualified?.(failResult);
    });
  }, [sessionId, wrongConnections, totalClicks, recalibrationCount, onDisqualified, playSequence]);

  timerExpireRef.current = handleTimerExpire;

  // Trigger Phase C Dialogue Warnings at 20s left and 10s left
  useEffect(() => {
    if (timeLeft === 20 && !hasPlayed20sRef.current) {
      hasPlayed20sRef.current = true;
      playLine(DIALOGUE_CONFIG.timeWarning20s);
    }
    if (timeLeft === 10 && !hasPlayed10sRef.current) {
      hasPlayed10sRef.current = true;
      playLine(DIALOGUE_CONFIG.timeWarning10s);
    }
  }, [timeLeft, playLine]);

  // ---- 2. Connection Cycle Completion (Tilt Forward -> Untilt) ----
  const currentSnappedRef = useRef(null);

  const handleConnectionCycleComplete = useCallback(async () => {
    setTotalClicks((c) => c + 1);

    const snapped = currentSnappedRef.current;
    if (!snapped || !snapped.node || !activeNode || !constellationList) return;

    const targetNode = snapped.node;

    // Validate if snapped target is the valid next step in linked list
    if (constellationList.isValidNextStep(activeNode.id, targetNode.id)) {
      // Valid connection!
      playSfx('correct');
      const newConn = { from: activeNode, to: targetNode };
      const updatedConns = [...completedConnections, newConn];
      setCompletedConnections(updatedConns);
      setActiveNode(targetNode);

      console.log('%c[ASTRA DIAGNOSTIC] 🔗 Wand Gesture Connection Step:', 'color: #38bdf8;', {
        connectedCount: updatedConns.length,
        requiredCount: constellationList.getTotalRequiredConnections(),
      });

      // Check if finished full constellation
      if (updatedConns.length >= constellationList.getTotalRequiredConnections()) {
        if (hasEndedRef.current) return;
        hasEndedRef.current = true;
        stopTimer();
        console.log('%c[ASTRA DIAGNOSTIC] ✨ FULL CONSTELLATION COMPLETED (Wand Gesture)!', 'color: #4ade80; font-weight: bold;');
        const elapsed = Date.now() - startTimeRef.current;
        const elapsedSec = Math.round(elapsed / 100) / 10;
        const travelCm = Math.round(wandTravelDistRef.current / 10) / 10;
        const calculatedScore = Math.max(75, 100 - wrongConnections * 5);

        const winResult = {
          completed_status: 1,
          isWin: true,
          score: calculatedScore,
          telemetry: {
            time_spent_sec: elapsedSec,
            wrong_attempts: wrongConnections,
            travel_dist_cm: travelCm > 0 ? travelCm : 28.5,
          },
        };

        if (sessionId) {
          submitAttempt(sessionId, {
            time_elapsed_ms: elapsed,
            wrong_connections: wrongConnections,
            total_clicks: totalClicks + 1,
            wand_travel_dist: wandTravelDistRef.current,
            recalibration_count: recalibrationCount,
            completed_status: 1,
          })
            .then((res) => startWinDialogue({ ...winResult, ...res }))
            .catch(() => startWinDialogue(winResult));
        } else {
          startWinDialogue(winResult);
        }
      }
    } else {
      // Invalid connection attempt
      if (activeNode.id !== targetNode.id) {
        setWrongConnections((w) => w + 1);
        playSfx('wrong');
      }
    }
  }, [activeNode, constellationList, completedConnections, sessionId, wrongConnections, totalClicks, recalibrationCount, onComplete]);

  // ---- 3. Wand Gestures Hook ----
  const handleWandConnectionCycle = useCallback(() => {
    const snapped = currentSnappedRef.current;
    const originNode = activeNodeRef.current;
    console.log('%c[ASTRA DIAGNOSTIC] 🪄 Wand Connection Cycle Fired!', 'color: #38bdf8;', {
      snappedNode: snapped?.node?.id,
      originNode: originNode?.id,
    });
    if (snapped?.node && originNode) {
      handleDragComplete({
        fromStarId: originNode.id,
        toStarId: snapped.node.id,
      });
    }
  }, [handleDragComplete]);

  const { videoRef, pointer, onDraw, gestureStatus, isReady } = useWandGestures({
    enabled: controlMode === 'wand' || controlMode === 'hybrid',
    onResetLines: handleResetLines,
    onForceExit: handleCircleExit,
    onRecalibrate: handleRecalibrate,
    onConnectionCycleComplete: handleWandConnectionCycle,
  });

  // Calculate magnetic snap every pointer update against all active star nodes
  const snappedPointer = useMemo(() => {
    if (!pointer) return null;
    const allStars = [...starNodes, ...fakeNodes];
    const snap = getMagneticSnap(pointer, allStars);
    currentSnappedRef.current = snap;
    return snap;
  }, [pointer, starNodes, fakeNodes]);

  // ---- Wand Auto-Snap & Auto-Trace Engine (Proximity based, zero pinch needed) ----
  const lastAutoSnapTimeRef = useRef(0);

  useEffect(() => {
    if (!pointer || (controlMode !== 'wand' && controlMode !== 'hybrid')) return;

    const allStars = [...starNodes, ...fakeNodes];
    const snap = getMagneticSnap(pointer, allStars);

    // If activeNode is null, auto-lock onto any star the player hovers near
    if (!activeNode && snap.snapped && snap.node) {
      setActiveNode(snap.node);
      playSfx('correct');
      return;
    }

    // If activeNode is set and player moves near a valid next target star
    if (activeNode && snap.snapped && snap.node && snap.node.id !== activeNode.id) {
      const now = Date.now();
      // Debounce auto-snap by 280ms
      if (now - lastAutoSnapTimeRef.current > 280) {
        const fromId = activeNode.id;
        const toId = snap.node.id;

        // Check if this is a valid edge
        const valid = isValidEdge(fromId, toId);
        const exists = completedConnections.some(
          (s) => (s.from === fromId && s.to === toId) || (s.from === toId && s.to === fromId)
        );

        if (valid && !exists) {
          lastAutoSnapTimeRef.current = now;
          console.log('%c[ASTRA DIAGNOSTIC] 🪄 Auto-Snapped Edge (Proximity):', 'color: #4ade80; font-weight: bold;', fromId, '->', toId);
          setActiveNode(snap.node);
          handleDragComplete({ fromStarId: fromId, toStarId: toId });
        }
      }
    }
  }, [pointer, activeNode, starNodes, fakeNodes, controlMode, isValidEdge, completedConnections, handleDragComplete]);

  // Live Auto-Trace starlight trajectory from activeNode to current hand pointer
  const wandDrawingPath = useMemo(() => {
    if (
      !pointer ||
      !activeNode ||
      winFlybyProgress !== null ||
      hasEndedRef.current ||
      (controlMode !== 'wand' && controlMode !== 'hybrid')
    ) {
      return [];
    }
    const originPos = toScreenNorm(activeNode.x, activeNode.y);
    return [originPos, { x: pointer.x, y: pointer.y }];
  }, [pointer, activeNode, winFlybyProgress, controlMode]);

  // Accumulate wand distance
  useEffect(() => {
    if (pointer && prevPointerRef.current) {
      const d = calculateDistance(
        prevPointerRef.current.x,
        prevPointerRef.current.y,
        pointer.x,
        pointer.y
      );
      wandTravelDistRef.current += d * 1000;
    }
    prevPointerRef.current = pointer;
  }, [pointer]);

  // Start Session on mount / attempt reset (Active 30s countdown timer enabled)
  useEffect(() => {
    setWinFlybyProgress(null);
    setCompletedConnections([]);
    setWrongConnections(0);
    setTotalClicks(0);
    setRecalibrationCount(0);
    wandTravelDistRef.current = 0;
    startTimeRef.current = Date.now();
    startTimer();

    if (player?.id && constellationData?.id) {
      startSession(player.id, constellationData.id)
        .then((res) => setSessionId(res.session_id))
        .catch(console.error);
    }

    function onResize() {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [player, constellationData, attemptNumber, startTimer]);

  // Calculate presentation scale and opacity (Entrance Arrival Easing + Win Fly-by Turn)
  let layerScale = 1.0;
  let layerOpacity = 1.0;
  let winTurnX = 0;
  let winTurnY = 0;

  if (winFlybyProgress !== null) {
    const p = winFlybyProgress;
    if (p < 0.35) {
      // Phase 1: Bank Turn (Constellation & Stars sweep up-left together as camera rotates)
      const turnP = Math.sin((p / 0.35) * (Math.PI / 2));
      layerScale = 1.0 + turnP * 1.8;
      layerOpacity = 1.0 - turnP * 0.6;
      winTurnX = -turnP * 580;
      winTurnY = -turnP * 720;
    } else {
      // Phase 2: Straight Forward Hyperspace Acceleration (Radial point at CENTER, constellation cleared off-screen)
      const fwdP = (p - 0.35) / 0.65;
      const cubicFwd = Math.pow(fwdP, 3);
      layerScale = 2.8 + cubicFwd * 3.2;
      layerOpacity = Math.max(0, 0.4 - fwdP * 0.8);
      winTurnX = -580 - fwdP * 300;
      winTurnY = -720 - fwdP * 300;
    }
  } else if (entryProgress < 1.0) {
    // Arrival: Drop out of hyperspace and settle into view smoothly
    // Easing: cubic-out (1 - (1 - t)^3)
    const easeOut = 1 - Math.pow(1 - entryProgress, 3);
    layerScale = 0.88 + 0.12 * easeOut;
    layerOpacity = easeOut;
  }

  const activeDrawingPath =
    winFlybyProgress !== null || hasEndedRef.current
      ? []
      : controlMode === 'mouse'
      ? mouseDrawingPath
      : (wandDrawingPath.length > 0 ? wandDrawingPath : mouseDrawingPath);

  const activePointer =
    controlMode === 'mouse'
      ? (winFlybyProgress !== null || hasEndedRef.current ? { ...mouseWand, isDrawing: false } : mouseWand)
      : {
          x: snappedPointer?.x ?? pointer?.x ?? 0.5,
          y: snappedPointer?.y ?? pointer?.y ?? 0.5,
          isDrawing: Boolean(activeNode && pointer && winFlybyProgress === null && !hasEndedRef.current),
        };

  return (
    <div className="screen screen--challenge">
      {/* Hidden/PIP Hardware Webcam Feed for MediaPipe Hands */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: showCamPip ? 220 : 1,
          height: showCamPip ? 165 : 1,
          opacity: showCamPip ? 0.95 : 0.001,
          pointerEvents: showCamPip ? 'auto' : 'none',
          borderRadius: 14,
          border: showCamPip ? '2px solid #818cf8' : 'none',
          boxShadow: showCamPip ? '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(99,102,241,0.4)' : 'none',
          zIndex: 99999,
          transform: 'scaleX(-1)', // Mirror user perspective
          transition: 'all 0.25s ease',
          backgroundColor: '#000',
        }}
      />

      {/* Main Presentation Layer */}
      <ConstellationLayer
        stars={[...starNodes, ...fakeNodes]}
        connectedSegments={completedConnections}
        validGuideSegments={validGuideSegments}
        wandPointer={activePointer}
        activeStarId={activeNode?.id}
        drawingPath={activeDrawingPath}
        snapEffect={snapEffect}
        opacity={layerOpacity}
        scale={layerScale}
        winTurnX={winTurnX}
        winTurnY={winTurnY}
        width={dimensions.w}
        height={dimensions.h}
      />

      {/* Floating Wand Reticle Cursor Overlay */}
      {winFlybyProgress === null && (
        <WandCursor
          pointer={activePointer}
          width={dimensions.w}
          height={dimensions.h}
        />
      )}

      {/* Upper Cockpit HUD: Constellation Badge (Left) + Timer (Right) */}
      {winFlybyProgress === null && (
        <HUD
          timeLeft={timeLeft}
          constellationName={constellationData?.name || constellationList?.name || 'Orion (Demo)'}
        />
      )}

      {/* Gameplay Subtitle Overlay */}
      <SubtitleOverlay subtitle={activeSubtitle} />
    </div>
  );
}
