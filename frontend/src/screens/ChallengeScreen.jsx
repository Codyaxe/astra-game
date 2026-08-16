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
import { getMagneticSnap, calculateDistance } from '../game/snapping';
import { playSfx } from '../utils/audio';
import { startSession, submitAttempt } from '../services/api';
import { PLACEHOLDER_STARS } from '../mock/placeholders';

export default function ChallengeScreen({
  player,
  constellationData,
  attemptNumber = 1,
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

  // Win Fly-by 3D Expansion & Turn Animation State (3.6s duration)
  const [winFlybyProgress, setWinFlybyProgress] = useState(null);

  const triggerWinSequence = useCallback((winResult) => {
    onWinStart?.();
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
        onComplete?.(winResult);
      }
    }

    animId = requestAnimationFrame(animateWinFlyby);
  }, [onWinStart, onComplete]);

  // Instantiate linked list model
  const constellationList = useMemo(() => {
    return constellationData ? new ConstellationLinkedList(constellationData) : null;
  }, [constellationData]);

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
        if (updatedConns.length >= requiredCount) {
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
              .then((res) => triggerWinSequence({ ...winResult, ...res }))
              .catch(() => triggerWinSequence(winResult));
          } else {
            triggerWinSequence(winResult);
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

  // Mouse-to-Wand Testing Adapter — pure input emitter, no snap logic inside
  const { wandPointer: mouseWand, drawingPath } = useMouseWandAdapter({
    stars: [...starNodes, ...fakeNodes],
    enabled: true,
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

  // Timer expiration: Disqualified
  const handleTimerExpire = useCallback(async () => {
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
    onDisqualified?.(failResult);
  }, [sessionId, wrongConnections, totalClicks, recalibrationCount, onDisqualified]);

  const timeLimit = constellationList?.timeLimitSec || 30;
  const { timeLeft, start: startTimer } = useGameTimer(timeLimit, handleTimerExpire);

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

      // Check if finished full constellation
      if (updatedConns.length >= constellationList.getTotalRequiredConnections()) {
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
            .then((res) => triggerWinSequence({ ...winResult, ...res }))
            .catch(() => triggerWinSequence(winResult));
        } else {
          triggerWinSequence(winResult);
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
  const { videoRef, pointer, onDraw, gestureStatus, isReady } = useWandGestures({
    enabled: true,
    onResetLines: handleResetLines,
    onForceExit: handleCircleExit,
    onRecalibrate: handleRecalibrate,
    onConnectionCycleComplete: handleConnectionCycleComplete,
  });

  // Calculate magnetic snap every pointer update
  const snappedPointer = useMemo(() => {
    if (!pointer || !constellationList) return null;
    const allStars = constellationList.getAllStarNodes();
    const snap = getMagneticSnap(pointer, allStars);
    currentSnappedRef.current = snap;
    return snap;
  }, [pointer, constellationList]);

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

  // Calculate win 3D fly-by expansion and turn parameters
  let winScale = 1.0;
  let winOpacity = 1.0;
  let winTurnX = 0;
  let winTurnY = 0;

  if (winFlybyProgress !== null) {
    const p = winFlybyProgress;
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
    <div className="screen screen--challenge">
      {/* Main Presentation Layer */}
      <ConstellationLayer
        stars={[...starNodes, ...fakeNodes]}
        connectedSegments={completedConnections}
        validGuideSegments={validGuideSegments}
        wandPointer={mouseWand || snappedPointer || pointer}
        activeStarId={activeNode?.id}
        drawingPath={drawingPath}
        snapEffect={snapEffect}
        opacity={winFlybyProgress !== null ? winOpacity : 1}
        scale={winScale}
        winTurnX={winTurnX}
        winTurnY={winTurnY}
        width={dimensions.w}
        height={dimensions.h}
      />

      {/* Floating Wand Reticle Cursor Overlay */}
      {winFlybyProgress === null && (
        <WandCursor
          pointer={mouseWand || snappedPointer || pointer}
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
    </div>
  );
}
