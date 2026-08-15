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
import HUD from '../components/HUD';
import { useWandGestures } from '../hooks/useWandGestures';
import { useGameTimer } from '../hooks/useGameTimer';
import { ConstellationLinkedList } from '../game/linkedListConstellation';
import { getMagneticSnap, calculateDistance } from '../game/snapping';
import { playSfx } from '../utils/audio';
import { startSession, submitAttempt } from '../services/api';

export default function ChallengeScreen({
  player,
  constellationData,
  attemptNumber = 1,
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

  // Instantiate linked list model
  const constellationList = useMemo(() => {
    return constellationData ? new ConstellationLinkedList(constellationData) : null;
  }, [constellationData]);

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
    if (!sessionId) {
      onDisqualified?.();
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
        completed_status: 2, // Disqualified
      });
    } catch (e) {
      console.error(e);
    }
    onDisqualified?.();
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
        try {
          const res = await submitAttempt(sessionId, {
            time_elapsed_ms: elapsed,
            wrong_connections: wrongConnections,
            total_clicks: totalClicks + 1,
            wand_travel_dist: wandTravelDistRef.current,
            recalibration_count: recalibrationCount,
            completed_status: 1, // Completed
          });
          onComplete?.(res);
        } catch (e) {
          onComplete?.({ completed_status: 1, score: 80 });
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

  // Auto-advance head when cursor magnetically snaps to the valid next node.
  useEffect(() => {
    if (!snappedPointer?.snapped || !snappedPointer.node || !activeNode || !constellationList) return;

    const targetNode = snappedPointer.node;
    if (targetNode.id === activeNode.id) return;

    const isValidNext = constellationList.isValidNextStep(activeNode.id, targetNode.id);
    if (!isValidNext) return;

    const alreadyConnected = completedConnections.some(
      (conn) => conn.from?.id === activeNode.id && conn.to?.id === targetNode.id
    );
    if (alreadyConnected) return;

    playSfx('correct');
    const newConn = { from: activeNode, to: targetNode };
    const updatedConns = [...completedConnections, newConn];
    setCompletedConnections(updatedConns);
    setActiveNode(targetNode);

    if (updatedConns.length >= constellationList.getTotalRequiredConnections()) {
      const elapsed = Date.now() - startTimeRef.current;
      submitAttempt(sessionId, {
        time_elapsed_ms: elapsed,
        wrong_connections: wrongConnections,
        total_clicks: totalClicks,
        wand_travel_dist: wandTravelDistRef.current,
        recalibration_count: recalibrationCount,
        completed_status: 1, // Completed
      })
        .then((res) => onComplete?.(res))
        .catch(() => onComplete?.({ completed_status: 1, score: 80 }));
    }
  }, [
    snappedPointer,
    activeNode,
    constellationList,
    completedConnections,
    sessionId,
    wrongConnections,
    totalClicks,
    recalibrationCount,
    onComplete,
  ]);

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

  // Start Session on mount
  useEffect(() => {
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
  }, [player, constellationData, startTimer]);

  return (
    <div className="screen screen--challenge">
      {/* Background Webcam */}
      <video ref={videoRef} autoPlay playsInline className="challenge-video" />

      {/* Main Interactive Canvas */}
      <ConstellationCanvas
        starNodes={constellationList?.getAllStarNodes() || []}
        fakeNodes={constellationList?.getAllFakeNodes() || []}
        completedConnections={completedConnections}
        activeNode={activeNode}
        wandPointer={pointer}
        snappedPointer={snappedPointer}
        onDraw={onDraw}
        width={dimensions.w}
        height={dimensions.h}
      />

      {/* HUD Bar */}
      <HUD
        constellationName={constellationList?.name}
        timeLeft={timeLeft}
        attemptNumber={attemptNumber}
        maxAttempts={3}
        wrongConnections={wrongConnections}
        clicks={totalClicks}
        gestureStatus={gestureStatus}
        onDraw={onDraw}
        recalibrations={recalibrationCount}
      />
    </div>
  );
}
