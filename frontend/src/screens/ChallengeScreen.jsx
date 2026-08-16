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
  constellationIndex = 0,
  attemptNumber = 1,
  controlMode = 'hybrid',
  showCamPip = false,
  difficulty = 'easy',
  gestureStyle = 'point_auto',
  allowFakeNodeTrace = true,
  snappingMode = 'sequential',
  snappingRadiusMultiplier = 1.0,
  onWinStart,
  onComplete,
  onForceExit,
  onDisqualified,
}) {
  const [sessionId, setSessionId] = useState(null);
  const [completedConnections, setCompletedConnections] = useState([]); // [{ from, to }]
  const [activeNode, setActiveNode] = useState(null);
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });

  // Initialize backend game session for telemetry and score recording
  useEffect(() => {
    if (player?.id) {
      startSession(player.id, constellationData?.id || 1)
        .then((res) => {
          if (res?.session_id) {
            setSessionId(res.session_id);
          }
        })
        .catch((err) => {
          console.warn('[ASTRA] Could not start backend session, using direct player submit:', err);
        });
    }
  }, [player?.id, constellationData?.id]);

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
  const baseTime = constellationList?.timeLimitSec || 30;
  const timeLimit = difficulty === 'hard' ? Math.max(10, Math.floor(baseTime / 2)) : baseTime;
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

  const WIN_FLYBY_DURATION_MS = 6000; // 👈 Configurable: 3D Constellation Turn & Warp Flyby Duration
  
  const startWinDialogue = useCallback((winResult) => {
    console.log('%c[ASTRA DIAGNOSTIC] 🎙️ startWinDialogue called with result:', 'color: #38bdf8; font-weight: bold;', winResult);

    // Timeout safety fallback: generous buffer so it NEVER cuts off the animation early!
    let safetyFired = false;
    const safetyTimer = setTimeout(() => {
      if (!safetyFired) {
        safetyFired = true;
        console.log('%c[ASTRA DIAGNOSTIC] ⚡ Safety Timer triggered -> Advancing stage!', 'color: #facc15; font-weight: bold;');
        onComplete?.(winResult);
      }
    }, WIN_FLYBY_DURATION_MS + 9000);

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
            const progress = Math.min(1.0, elapsed / WIN_FLYBY_DURATION_MS);
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
    if (hasEndedRef.current || winFlybyProgress !== null) return;
    if (fromStarId != null && toStarId != null) {
      // Find if this exact edge (fromStarId <-> toStarId) already exists in completedConnections
      const existingConnIdx = completedConnections.findIndex(
        (c) =>
          (String(c.from) === String(fromStarId) && String(c.to) === String(toStarId)) ||
          (String(c.from) === String(toStarId) && String(c.to) === String(fromStarId))
      );

      // If the exact edge already exists: UNTRACE / REMOVE ONLY THIS SPECIFIC EDGE!
      if (existingConnIdx !== -1) {
        console.log('%c[ASTRA DIAGNOSTIC] ↩️ Specific Edge Removed (Untraced):', 'color: #f59e0b; font-weight: bold;', fromStarId, '<->', toStarId);
        setCompletedConnections((prev) => prev.filter((_, idx) => idx !== existingConnIdx));
        if (snappingMode === 'freeform') {
          setActiveNode(null);
          activeNodeRef.current = null;
        } else {
          const targetNode = [...starNodes, ...fakeNodes].find((s) => String(s.id) === String(toStarId));
          if (targetNode) {
            setActiveNode(targetNode);
            activeNodeRef.current = targetNode;
          }
        }
        playSfx('snap');
        return;
      }

      // Check if edge is valid in either direction (bidirectional)
      const valid = isValidEdge(fromStarId, toStarId);

      if (valid) {
        // SUCCESS SNAP (isSnap = true)
        const result = { success: true, from: fromStarId, to: toStarId, timestamp: Date.now() };
        setSnapEffect(result);
        const updatedConns = [...completedConnections, { from: fromStarId, to: toStarId, isWrong: false }];
        setCompletedConnections(updatedConns);
        const targetNode = [...starNodes, ...fakeNodes].find((s) => s.id === toStarId);
        if (targetNode) {
          if (snappingMode === 'freeform') {
            setActiveNode(null);
            activeNodeRef.current = null;
          } else {
            setActiveNode(targetNode);
            activeNodeRef.current = targetNode;
          }
        }
        playSfx('snap');

        // Check if finished full constellation
        const requiredCount = validGuideSegments.length > 0 ? validGuideSegments.length : starNodes.length - 1;
        const validConnCount = updatedConns.filter((c) => !c.isWrong).length;
        console.log('%c[ASTRA DIAGNOSTIC] 🔗 Snap Connection Added!', 'color: #38bdf8;', {
          from: fromStarId,
          to: toStarId,
          validConnCount,
          requiredCount,
          snappingMode,
        });

        if (validConnCount >= requiredCount) {
          if (hasEndedRef.current) return;
          hasEndedRef.current = true;
          setActiveNode(null);
          stopTimer();

          // Full Aries Constellation Completed -> End Briefing
          setIsBriefingActive(false);
          stopDialogue();
          console.log('%c[ASTRA DIAGNOSTIC] ✨ FULL CONSTELLATION COMPLETED -> Briefing Ended!', 'color: #4ade80; font-weight: bold;');

          const elapsed = Date.now() - startTimeRef.current;
          const elapsedSec = Math.round(elapsed / 100) / 10;
          const travelCm = Math.round(wandTravelDistRef.current / 10) / 10;

          // Percentage Scoring: 70% Completion + up to 30% Speed Bonus (0% mistake penalty)
          const limitSec = timeLimit || 30;
          const timeRatio = Math.min(1.0, elapsedSec / limitSec);
          const speedScore = 30 * Math.max(0.0, 1.0 - timeRatio);
          const calculatedScore = Math.round((70 + speedScore) * 10) / 10;

          const winResult = {
            completed_status: 1,
            isWin: true,
            score: calculatedScore,
            telemetry: {
              time_spent_sec: elapsedSec,
              wrong_attempts: wrongConnections,
              travel_dist_cm: travelCm,
            },
          };

          if (sessionId || player?.id) {
            submitAttempt({
              session_id: sessionId,
              player_id: player?.id,
              score: calculatedScore,
              time_elapsed_ms: elapsed,
              wrong_connections: wrongConnections,
              total_clicks: totalClicks + 1,
              wand_travel_dist: wandTravelDistRef.current,
              recalibration_count: recalibrationCount,
              completed_status: 1,
              completed_connections: completedConnections.length + 1,
              total_connections: validGuideSegments.length || (starNodes.length - 1),
            })
              .then((res) => startWinDialogue({ ...winResult, ...res }))
              .catch(() => startWinDialogue(winResult));
          } else {
            startWinDialogue(winResult);
          }
        }
      } else if (!exists && allowFakeNodeTrace && (difficulty === 'medium' || difficulty === 'hard')) {
        // TRAP STAR / DECOY SNAP (Adds red error line, shifts activeNode to decoy star)
        console.log('%c[ASTRA DIAGNOSTIC] ⚠️ Decoy Star Trapped!', 'color: #ef4444; font-weight: bold;', fromStarId, '->', toStarId);
        const result = { success: false, from: fromStarId, to: toStarId, timestamp: Date.now() };
        setSnapEffect(result);
        const updatedConns = [...completedConnections, { from: fromStarId, to: toStarId, isWrong: true }];
        setCompletedConnections(updatedConns);
        const targetNode = [...starNodes, ...fakeNodes].find((s) => s.id === toStarId);
        if (targetNode) {
          if (snappingMode === 'freeform') {
            setActiveNode(null);
            activeNodeRef.current = null;
          } else {
            setActiveNode(targetNode);
            activeNodeRef.current = targetNode;
          }
        }
        playSfx('wrong');
        setWrongConnections((prev) => prev + 1);
      } else {
        // INVALID EDGE OR ALREADY CONNECTED
        const result = { success: false, from: fromStarId, to: toStarId, timestamp: Date.now() };
        setSnapEffect(result);
        playSfx('wrong');
        setWrongConnections((prev) => prev + 1);
      }
    } else {
      // RELEASED IN EMPTY SPACE
      const result = { success: false, from: fromStarId, to: null, timestamp: Date.now() };
      setSnapEffect(result);
      playSfx('wrong');
    }
  }, [completedConnections, isValidEdge, starNodes, fakeNodes, allowFakeNodeTrace, difficulty, snappingMode, wrongConnections, sessionId, totalClicks, recalibrationCount, startWinDialogue, stopTimer, validGuideSegments]);

  const activeNodeRef = useRef(activeNode);
  useEffect(() => {
    activeNodeRef.current = activeNode;
  }, [activeNode]);

  // Mouse-to-Wand Testing Adapter — pure input emitter, enabled only when in mouse/hybrid mode
  const { wandPointer: mouseWand, drawingPath: mouseDrawingPath } = useMouseWandAdapter({
    stars: [...starNodes, ...fakeNodes],
    enabled: controlMode === 'mouse' || controlMode === 'hybrid',
    snappingRadiusMultiplier,
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
    if (hasEndedRef.current || winFlybyProgress !== null) return;
    if (constellationList) {
      setCompletedConnections([]);
      setActiveNode(constellationList.getHead());
      playSfx('wrong');
    }
  }, [constellationList, winFlybyProgress]);

  // Circle motion: Force Emergency Exit
  const handleCircleExit = useCallback(async () => {
    if (hasEndedRef.current || winFlybyProgress !== null) return;
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
  }, [sessionId, wrongConnections, totalClicks, recalibrationCount, onForceExit, winFlybyProgress]);

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
    if (hasEndedRef.current || winFlybyProgress !== null) return;
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

  const { videoRef, pointer, onDraw, gestureStatus, isReady } = useWandGestures({
    enabled: controlMode === 'wand' || controlMode === 'hybrid',
    onResetLines: handleResetLines,
    onForceExit: handleCircleExit,
    onRecalibrate: handleRecalibrate,
  });

  // Calculate magnetic snap every pointer update against all active star nodes
  const snappedPointer = useMemo(() => {
    if (!pointer) return null;
    const allStars = [...starNodes, ...fakeNodes];
    const snap = getMagneticSnap(pointer, allStars, snappingRadiusMultiplier);
    currentSnappedRef.current = snap;
    return snap;
  }, [pointer, starNodes, fakeNodes, snappingRadiusMultiplier]);

  // ---- Wand Auto-Snap, Reverse Trace Undo & Fake Star Tracing Engine ----
  const lastAutoSnapTimeRef = useRef(0);

  useEffect(() => {
    if (hasEndedRef.current || winFlybyProgress !== null) return;
    if (!pointer || (controlMode !== 'wand' && controlMode !== 'hybrid')) return;

    const allStars = [...starNodes, ...fakeNodes];
    const snap = getMagneticSnap(pointer, allStars, snappingRadiusMultiplier);

    // In Palm/Fist mode: only Open Palm traces. Closed fist pauses and releases freeform anchor.
    if (gestureStyle === 'fist_open' && !pointer.isOpenPalm) {
      if (snappingMode === 'freeform' && activeNode) {
        setActiveNode(null);
        activeNodeRef.current = null;
      }
      return;
    }

    // Console Diagnostic Logging
    const gState = pointer.isFist ? '✊ FIST' : pointer.isOpenPalm ? '✋ PALM' : '👉 POINT';
    if (Math.random() < 0.04) {
      console.log('%c[ASTRA DIAGNOSTIC] 📡 Tracking:', 'color: #38bdf8;', {
        gesture: gState,
        activeBase: activeNode?.id ?? 'NONE (Free)',
        snappingMode,
        hoveredStar: snap?.node?.id ?? 'NONE',
      });
    }

    // 1. If activeNode is null, lock onto whichever star the player opens palm on / hovers near
    if (!activeNode && snap.snapped && snap.node) {
      console.log('%c[ASTRA DIAGNOSTIC] 🎯 Locked Base to star #', 'color: #38bdf8; font-weight: bold;', snap.node.id, `(Mode: ${snappingMode})`);
      setActiveNode(snap.node);
      activeNodeRef.current = snap.node;
      playSfx('correct');
      return;
    }

    // 2. If activeNode is set and player moves near a different star node
    if (activeNode && snap.snapped && snap.node && snap.node.id !== activeNode.id) {
      const now = Date.now();
      if (now - lastAutoSnapTimeRef.current > 250) {
        const fromId = activeNode.id;
        const toId = snap.node.id;

        // Check if this exact edge (fromId <-> toId) already exists
        const existingConnIdx = completedConnections.findIndex(
          (c) =>
            (String(c.from) === String(fromId) && String(c.to) === String(toId)) ||
            (String(c.from) === String(toId) && String(c.to) === String(fromId))
        );

        if (existingConnIdx !== -1) {
          // Player explicitly traced back across an existing edge (A->B or B->A) -> Untraces ONLY this edge!
          lastAutoSnapTimeRef.current = now;
          console.log('%c[ASTRA DIAGNOSTIC] ↩️ Specific Edge Untraced:', 'color: #f59e0b; font-weight: bold;', fromId, '<->', toId);
          handleDragComplete({ fromStarId: fromId, toStarId: toId });
          return;
        }

        // FORWARD CONNECTION CHECK
        const valid = isValidEdge(fromId, toId);

        if (valid) {
          // Valid forward edge -> Connects without removing any other traces!
          lastAutoSnapTimeRef.current = now;
          console.log('%c[ASTRA DIAGNOSTIC] 🪄 Connected Valid Edge:', 'color: #4ade80; font-weight: bold;', fromId, '->', toId, `(Mode: ${snappingMode})`);
          handleDragComplete({ fromStarId: fromId, toStarId: toId });
          if (snappingMode === 'freeform') {
            // Freeform: Immediately clear origin so user can start next stroke from ANY star
            setActiveNode(null);
            activeNodeRef.current = null;
          } else {
            // Sequential: Chain base to target star
            setActiveNode(snap.node);
            activeNodeRef.current = snap.node;
          }
        } else if (allowFakeNodeTrace && (difficulty === 'medium' || difficulty === 'hard')) {
          // Fake / Decoy Star Snapping in Medium and Hard mode
          lastAutoSnapTimeRef.current = now;
          console.log('%c[ASTRA DIAGNOSTIC] ⚠️ Connected to Fake Star Decoy:', 'color: #ef4444; font-weight: bold;', fromId, '->', toId, `(Mode: ${snappingMode})`);
          setCompletedConnections((prev) => [...prev, { from: fromId, to: toId, isWrong: true }]);
          setWrongConnections((w) => w + 1);
          playSfx('wrong');
          if (snappingMode === 'freeform') {
            setActiveNode(null);
            activeNodeRef.current = null;
          } else {
            setActiveNode(snap.node);
            activeNodeRef.current = snap.node;
          }
        } else if (snappingMode === 'freeform' && !valid) {
          // Freeform mode: If moving to an unrelated star that isn't a valid connection, re-anchor origin to this star!
          lastAutoSnapTimeRef.current = now;
          setActiveNode(snap.node);
          activeNodeRef.current = snap.node;
          console.log('%c[ASTRA DIAGNOSTIC] ✨ Freeform Re-anchored Origin to star #', 'color: #38bdf8;', snap.node.id);
        }
      }
    }
  }, [pointer, activeNode, starNodes, fakeNodes, controlMode, gestureStyle, allowFakeNodeTrace, snappingMode, difficulty, isValidEdge, completedConnections, handleDragComplete]);

  // Live Auto-Trace starlight trajectory from activeNode to current hand pointer
  const wandDrawingPath = useMemo(() => {
    if (
      !pointer ||
      !activeNode ||
      (gestureStyle === 'fist_open' && !pointer.isOpenPalm) ||
      winFlybyProgress !== null ||
      hasEndedRef.current ||
      (controlMode !== 'wand' && controlMode !== 'hybrid')
    ) {
      return [];
    }
    const originPos = toScreenNorm(activeNode.x, activeNode.y);
    return [originPos, { x: pointer.x, y: pointer.y }];
  }, [pointer, activeNode, gestureStyle, winFlybyProgress, controlMode]);

  // Accumulate wand distance (supports both MediaPipe pointer and mouse)
  useEffect(() => {
    const currentPtr = pointer || (mouseWand?.isDrawing ? mouseWand : null);
    if (currentPtr && prevPointerRef.current) {
      const d = calculateDistance(
        prevPointerRef.current.x,
        prevPointerRef.current.y,
        currentPtr.x,
        currentPtr.y
      );
      if (!isNaN(d) && d > 0.001) {
        wandTravelDistRef.current += d * 1000;
      }
    }
    prevPointerRef.current = currentPtr;
  }, [pointer, mouseWand]);

  // Briefing State: Voiceover & ghost tracing animation only play on Attempt 1 Tutorial Stage (Aries)
  const isTutorialStage =
    attemptNumber === 1 &&
    constellationIndex === 0 &&
    Boolean(constellationData?.name?.toLowerCase().includes('aries'));
  const [isBriefingActive, setIsBriefingActive] = useState(isTutorialStage);

  const handleSkipBriefing = useCallback(() => {
    setIsBriefingActive(false);
    stopDialogue();
    startTimeRef.current = Date.now();
    startTimer();
    console.log('%c[ASTRA DIAGNOSTIC] ⏩ Skipped Briefing -> Gameplay Timer Started!', 'color: #4ade80; font-weight: bold;');
  }, [startTimer, stopDialogue]);

  // Start Session on mount / attempt reset
  useEffect(() => {
    setWinFlybyProgress(null);
    setCompletedConnections([]);
    setWrongConnections(0);
    setTotalClicks(0);
    setRecalibrationCount(0);
    wandTravelDistRef.current = 0;

    if (isTutorialStage) {
      setIsBriefingActive(true);
      console.log('%c[ASTRA DIAGNOSTIC] 🎙️ Starting Tutorial Stage Briefing Voiceover (Attempt 1 Aries)...', 'color: #38bdf8; font-weight: bold;');
      // Play Ship AI Phase A & B Voiceovers during tutorial entrance briefing
      playSequence([...DIALOGUE_CONFIG.phaseA, ...DIALOGUE_CONFIG.phaseB], () => {
        console.log('%c[ASTRA DIAGNOSTIC] 🎙️ Entrance Voiceover audio finished.', 'color: #70a1ff;');
      });
    } else {
      setIsBriefingActive(false);
      stopDialogue();
      startTimeRef.current = Date.now();
      startTimer();
      console.log('%c[ASTRA DIAGNOSTIC] ⚡ Reattempt / Regular Constellation -> Briefing bypassed, gameplay active immediately!', 'color: #4ade80;');
    }

    if (player?.id && constellationData?.id) {
      startSession(player.id, constellationData.id)
        .then((res) => setSessionId(res.session_id))
        .catch(console.error);
    }

    function onResize() {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      stopDialogue();
    };
  }, [isTutorialStage, constellationData?.id, player?.id, playSequence, startTimer, stopDialogue]);

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

  const isTracing =
    winFlybyProgress === null &&
    !hasEndedRef.current &&
    (gestureStyle !== 'fist_open' || !pointer?.isFist) &&
    Boolean(activeNode && pointer);

  const activePointer =
    controlMode === 'mouse'
      ? (winFlybyProgress !== null || hasEndedRef.current ? { ...mouseWand, isDrawing: false } : mouseWand)
      : {
        x: snappedPointer?.x ?? pointer?.x ?? 0.5,
        y: snappedPointer?.y ?? pointer?.y ?? 0.5,
        isDrawing: isTracing,
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
        difficulty={difficulty}
        opacity={layerOpacity}
        scale={layerScale}
        winTurnX={winTurnX}
        winTurnY={winTurnY}
        width={dimensions.w}
        height={dimensions.h}
        showTutorialGuide={isBriefingActive}
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
          timeLeft={isBriefingActive ? timeLimit : timeLeft}
          constellationName={constellationData?.name || constellationList?.name || 'Aries (Tutorial)'}
        />
      )}

      {/* Prominent Center-Bottom Action Button during Briefing */}
      {isBriefingActive && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeToVisible 1.2s ease-in-out forwards',
          }}
        >
          <button
            onClick={handleSkipBriefing}
            style={{
              background: 'linear-gradient(135deg, #f4d58d 0%, #e0a93b 100%)',
              color: '#080c18',
              border: '2px solid #ffffff',
              borderRadius: '24px',
              padding: '16px 42px',
              fontSize: '17px',
              fontWeight: 900,
              marginBottom: '8rem',
              letterSpacing: '2px',
              cursor: 'pointer',
              boxShadow: '0 8px 35px rgba(0, 0, 0, 0.8), 0 0 35px rgba(244, 213, 141, 0.85)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              fontFamily: "'Outfit', sans-serif",
              animation: 'pulseGlowBtn 2.5s ease-in-out infinite',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = '0 12px 45px rgba(0, 0, 0, 0.9), 0 0 50px rgba(244, 213, 141, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 35px rgba(0, 0, 0, 0.8), 0 0 35px rgba(244, 213, 141, 0.85)';
            }}
          >
            <span>SKIP GUIDE TRACING</span>
            <span style={{ fontSize: 20 }}>⮞</span>
          </button>
          <style>{`
            @keyframes pulseGlowBtn {
              0%, 100% { box-shadow: 0 8px 35px rgba(0,0,0,0.8), 0 0 25px rgba(244, 213, 141, 0.7); }
              50% { box-shadow: 0 8px 45px rgba(0,0,0,0.9), 0 0 45px rgba(244, 213, 141, 1); }
            }
            @keyframes fadeToVisible {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Gameplay & Transmission Subtitle Overlay */}
      <SubtitleOverlay subtitle={activeSubtitle} />
    </div>
  );
}
