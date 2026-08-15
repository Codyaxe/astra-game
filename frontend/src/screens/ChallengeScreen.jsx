/**
 * ChallengeScreen.jsx — Constellation Tracing with Manual Finger Controls & Mistake Trails
 *
 * Controls:
 * - 1 Finger: Free cursor movement (no auto-snap)
 * - 2 Fingers Up (✌️) / Mouse Press: Activates manual magnetic snap to nearest star or decoy
 * - 3 Fingers Up (🤟): Full reset (clears lines & mistake trails, returns to head star)
 *
 * Visuals:
 * - Valid connections: Glowing Green Lines
 * - Mistake attempts: Dashed Red Lines
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
  onDisqualified,
}) {
  const [sessionId, setSessionId] = useState(null);
  const [completedConnections, setCompletedConnections] = useState([]); // [{ from, to }] (Green)
  const [mistakeTrails, setMistakeTrails] = useState([]);               // [{ from, to }] (Red)
  const [activeNode, setActiveNode] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [solvedScore, setSolvedScore] = useState(null);
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });

  // Telemetry
  const [wrongConnections, setWrongConnections] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);

  // Refs for atomic real-time updates
  const sessionIdRef = useRef(null);
  const connectionsRef = useRef([]);
  const mistakesRef = useRef([]);
  const activeNodeRef = useRef(null);
  const wrongCountRef = useRef(0);
  const clicksRef = useRef(0);
  const isCompletedRef = useRef(false);
  const wandTravelDistRef = useRef(0);
  const prevPointerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const currentSnappedRef = useRef(null);
  const sessionStartedRef = useRef(false);

  // Linked list model
  const constellationList = useMemo(() => {
    return constellationData ? new ConstellationLinkedList(constellationData) : null;
  }, [constellationData]);

  // Initial head star setup
  useEffect(() => {
    if (constellationList) {
      const head = constellationList.getHead();
      console.log(`%c[ASTRA] Constellation: ${constellationList.name} | Start: ${head?.label || head?.id}`, 'color: #38bdf8; font-weight: bold;');
      setActiveNode(head);
      activeNodeRef.current = head;
      setCompletedConnections([]);
      setMistakeTrails([]);
      connectionsRef.current = [];
      mistakesRef.current = [];
      wrongCountRef.current = 0;
      setWrongConnections(0);
      isCompletedRef.current = false;
      setIsCompleted(false);
      setSolvedScore(null);
    }
  }, [constellationList]);

  // 3 Fingers Up: Full Reset back to Head Star
  const handleFullReset = useCallback(() => {
    if (constellationList && !isCompletedRef.current) {
      console.log('%c[ASTRA] 🤟 3 Fingers: Full Reset Triggered!', 'color: #f59e0b; font-weight: bold;');
      connectionsRef.current = [];
      mistakesRef.current = [];
      setCompletedConnections([]);
      setMistakeTrails([]);
      const head = constellationList.getHead();
      activeNodeRef.current = head;
      setActiveNode(head);
      playSfx('wrong');
    }
  }, [constellationList]);

  // Timer expiration
  const handleTimerExpire = useCallback(async () => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    console.warn('[ASTRA] ⏳ Time Expired! Disqualifying attempt...');
    playSfx('timerEnd');
    const elapsed = Date.now() - startTimeRef.current;
    const currentSid = sessionIdRef.current || sessionId;
    if (currentSid) {
      try {
        const res = await submitAttempt(currentSid, {
          time_elapsed_ms: elapsed,
          wrong_connections: wrongCountRef.current,
          total_clicks: clicksRef.current,
          wand_travel_dist: wandTravelDistRef.current,
          recalibration_count: 0,
          completed_status: 2, // Disqualified
        });
        onDisqualified?.(res);
        return;
      } catch (e) {
        console.error('[ASTRA] Disqualify submit error:', e);
      }
    }
    onDisqualified?.();
  }, [sessionId, onDisqualified]);

  const timeLimit = constellationList?.timeLimitSec || 30;
  const { timeLeft, start: startTimer } = useGameTimer(timeLimit, handleTimerExpire);

  // Manual Node Connection Evaluator (called on 2-finger snap selection or mouse release)
  const handleNodeSelection = useCallback((targetNode) => {
    if (isCompletedRef.current || !constellationList || !targetNode) return;

    const currentActive = activeNodeRef.current;
    if (!currentActive) return;

    // Ignore clicking the same star
    if (currentActive.id === targetNode.id) return;

    clicksRef.current += 1;
    setTotalClicks(clicksRef.current);

    const isValid = constellationList.isValidNextStep(currentActive.id, targetNode.id);

    if (isValid) {
      // 1. Correct Next Star! (Add Green Line)
      playSfx('correct');
      const newConn = { from: currentActive, to: targetNode };
      const updatedConns = [...connectionsRef.current, newConn];
      connectionsRef.current = updatedConns;
      setCompletedConnections(updatedConns);

      activeNodeRef.current = targetNode;
      setActiveNode(targetNode);

      const totalRequired = constellationList.getTotalRequiredConnections();
      console.log(`%c[ASTRA] ✅ Connected: ${currentActive.label || currentActive.id} ──> ${targetNode.label || targetNode.id} (${updatedConns.length}/${totalRequired})`, 'color: #4ade80; font-weight: bold;');

      // 2. Check if constellation is 100% complete
      if (updatedConns.length >= totalRequired) {
        isCompletedRef.current = true;
        setIsCompleted(true);

        const elapsed = Date.now() - startTimeRef.current;
        const currentSid = sessionIdRef.current || sessionId;
        console.log(`%c[ASTRA] 🎉 ${constellationList.name} Solved! Submitting...`, 'color: #facc15; font-size: 14px; font-weight: bold;');

        setTimeout(async () => {
          if (currentSid) {
            try {
              const res = await submitAttempt(currentSid, {
                time_elapsed_ms: elapsed,
                wrong_connections: wrongCountRef.current,
                total_clicks: clicksRef.current,
                wand_travel_dist: wandTravelDistRef.current,
                recalibration_count: 0,
                completed_status: 1,
              });
              const score = res.attempt_score ?? res.score ?? 90;
              setSolvedScore(score);
              console.log(`%c[ASTRA SCORE RESULT] 🏆 Score: ${score} pts`, 'color: #4ade80; font-size: 16px; font-weight: bold;');
              onComplete?.(res);
              return;
            } catch (e) {
              console.error('[ASTRA] Submit error:', e);
            }
          }
          setSolvedScore(92.5);
          onComplete?.({ completed_status: 1, score: 92.5, attempt_score: 92.5 });
        }, 1200);
      }
    } else {
      // 3. Mistake / Wrong Node / Decoy! (Add Red Dashed Line)
      wrongCountRef.current += 1;
      setWrongConnections(wrongCountRef.current);
      playSfx('wrong');

      const mistakeConn = { from: currentActive, to: targetNode };
      const updatedMistakes = [...mistakesRef.current, mistakeConn];
      mistakesRef.current = updatedMistakes;
      setMistakeTrails(updatedMistakes);

      console.warn(`[ASTRA] ❌ Mistake: Connected ${currentActive.label || currentActive.id} to wrong star ${targetNode.label || targetNode.id || 'Decoy'}! (Total Mistakes: ${wrongCountRef.current})`);
    }
  }, [constellationList, sessionId, onComplete]);

  // Wand tracking hook with 2-finger snap & 3-finger reset
  const { videoRef, pointer, isManualSnap, gestureStatus } = useWandGestures({
    enabled: true,
    onResetAll: handleFullReset,
    onManualSnapSelect: (event) => {
      if (event === 'snap_start') {
        const snapped = currentSnappedRef.current;
        if (snapped?.node) {
          handleNodeSelection(snapped.node);
        }
      }
    },
  });

  // Mouse fallback
  const [mousePointer, setMousePointer] = useState(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const effectivePointer = pointer || mousePointer;
  const isSnapActive = isManualSnap || isMouseDown;

  const lastSnappedIdRef = useRef(null);

  // Magnetic Snapping (searches BOTH real stars AND fake decoy stars)
  const snappedPointer = useMemo(() => {
    if (!effectivePointer || !constellationList || !isSnapActive) {
      currentSnappedRef.current = null;
      lastSnappedIdRef.current = null;
      return null;
    }

    const allStars = constellationList.getAllStarNodes();
    const fakeStars = constellationList.getAllFakeNodes() || [];
    const allInteractiveNodes = [...allStars, ...fakeStars];

    const snap = getMagneticSnap(effectivePointer, allInteractiveNodes);
    currentSnappedRef.current = snap;

    if (snap?.snapped && snap?.node && snap.node.id !== lastSnappedIdRef.current) {
      lastSnappedIdRef.current = snap.node.id;
      console.log(`[ASTRA] ✌️ 2-Finger Snap: Reached star ${snap.node.label || snap.node.id}`);
      handleNodeSelection(snap.node);
    } else if (!snap?.snapped) {
      lastSnappedIdRef.current = null;
    }

    return snap;
  }, [effectivePointer, constellationList, isSnapActive, handleNodeSelection]);

  // Distance tracking
  useEffect(() => {
    if (effectivePointer && prevPointerRef.current) {
      const d = calculateDistance(
        prevPointerRef.current.x,
        prevPointerRef.current.y,
        effectivePointer.x,
        effectivePointer.y
      );
      wandTravelDistRef.current += d * 1000;
    }
    prevPointerRef.current = effectivePointer;
  }, [effectivePointer]);

  // Start Session on mount
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    startTimeRef.current = Date.now();
    startTimer();

    const pid = player?.id || 1;
    const cid = constellationData?.id || 1;

    startSession(pid, cid)
      .then((res) => {
        console.log(`%c[ASTRA] Game Session Started (ID: ${res.session_id})`, 'color: #a78bfa;');
        setSessionId(res.session_id);
        sessionIdRef.current = res.session_id;
      })
      .catch((err) => {
        console.warn('[ASTRA] startSession error:', err);
      });

    function onResize() {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Mouse event handlers
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePointer({ x, y });
  };

  const handleMouseDown = () => {
    setIsMouseDown(true);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    const target = currentSnappedRef.current?.node;
    if (target) {
      handleNodeSelection(target);
    }
  };

  return (
    <div
      className="screen screen--challenge"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ cursor: pointer ? 'none' : 'crosshair' }}
    >
      {/* Background Webcam */}
      <video ref={videoRef} autoPlay playsInline className="challenge-video" />

      {/* Main Interactive Canvas */}
      <ConstellationCanvas
        starNodes={constellationList?.getAllStarNodes() || []}
        fakeNodes={constellationList?.getAllFakeNodes() || []}
        completedConnections={completedConnections}
        mistakeTrails={mistakeTrails}
        activeNode={activeNode}
        wandPointer={effectivePointer}
        snappedPointer={snappedPointer}
        onDraw={isSnapActive}
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
        gestureStatus={pointer ? gestureStatus : isMouseDown ? 'Manual Snap Active (Mouse)' : 'Free Pointing (Mouse)'}
        onDraw={isSnapActive}
        recalibrations={0}
      />

      {/* Completion Banner */}
      {isCompleted && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(10, 14, 26, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          animation: 'fade-in 0.3s ease-out',
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            color: '#4ade80',
            textShadow: '0 0 25px rgba(74, 222, 128, 0.9)',
            marginBottom: '0.5rem',
          }}>
            ✦ {constellationList?.name} Solved!
          </h2>
          <p style={{ color: '#facc15', fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Score: {solvedScore !== null ? `${solvedScore} pts` : 'Calculating…'}
          </p>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
            Loading next constellation…
          </p>
        </div>
      )}
    </div>
  );
}
