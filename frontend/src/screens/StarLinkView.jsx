/**
 * StarLinkView.jsx — Main Master Presentation View for Star Link
 * 
 * Orchestrates:
 * 1. HTTP fetch (round init) & WebSocket streaming (wand + segment events)
 * 2. Starfield Canvas background state machine (idle -> warping -> settled -> sustained_warp OR impact -> frozen)
 * 3. Constellation star nodes & snapped connection layer
 * 4. Host-driven synchronized timer
 * 5. Score overlay on round end
 * 6. Interactive test/debug controls for rapid validation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import StarfieldCanvas from '../components/starlink/StarfieldCanvas';
import ConstellationLayer from '../components/starlink/ConstellationLayer';
import WandCursor from '../components/starlink/WandCursor';
import HostTimer from '../components/starlink/HostTimer';
import ScoreOverlay from '../components/starlink/ScoreOverlay';

import { fetchRoundInit } from '../mock/mockApi';
import { MockWebSocketClient } from '../mock/mockWebSocket';

export default function StarLinkView({ onReturnMenu = null }) {
  // Game & Presentation state
  const [bgState, setBgState] = useState('warping'); // 'idle' | 'warping' | 'settled' | 'turning' | 'sustained_warp' | 'impact' | 'frozen'
  const [turnDir, setTurnDir] = useState(0); // -1 (left), 0 (none), +1 (right)
  const [constellation, setConstellation] = useState(null);
  const [hostTimerData, setHostTimerData] = useState(null);

  // Wand & Connection state
  const [wandPointer, setWandPointer] = useState({ x: 0.5, y: 0.5, isDrawing: false });
  const [connectedSegments, setConnectedSegments] = useState([]);
  const [activeStarId, setActiveStarId] = useState(1); // Head star

  // Outcome & Score
  const [showScore, setShowScore] = useState(false);
  const [isWin, setIsWin] = useState(true);
  const [score, setScore] = useState(90);

  // Canvas ref for imperative freeze if needed
  const starfieldRef = useRef(null);
  const wsRef = useRef(null);

  // 1. Initialize HTTP round data & WebSocket mock stream
  const initRound = useCallback(async () => {
    // Reset state
    setBgState('warping');
    setShowScore(false);
    setConnectedSegments([]);
    setTurnDir(0);

    // Fetch Init Data via HTTP
    try {
      const res = await fetchRoundInit();
      if (res.success) {
        setConstellation(res.constellation);
        setHostTimerData(res.hostTimer);
        setActiveStarId(res.constellation.stars[0]?.id || 1);
      }
    } catch (e) {
      console.error('Failed to init round', e);
    }

    // Warp-in state stays in continuous motion until game state is initialized
  }, []);

  useEffect(() => {
    // Instantiate Mock WebSocket
    const ws = new MockWebSocketClient();
    wsRef.current = ws;
    ws.connect();

    // Event Subscriptions
    const unsubWand = ws.on('wand_update', (data) => {
      setWandPointer(data);
    });

    const unsubSegment = ws.on('segment_connected', (data) => {
      setConnectedSegments((prev) => [...prev, { from: data.from, to: data.to }]);
      setActiveStarId(data.to);
    });

    const unsubWin = ws.on('round_win', (data) => {
      setScore(data.score || 95);
      setIsWin(true);
      // WIN BRANCH: Sustained continuous warp + score overlay on top
      setBgState('sustained_warp');
      setShowScore(true);
    });

    const unsubFail = ws.on('round_fail', (_data) => {
      setScore(40);
      setIsWin(false);
      // FAIL BRANCH: 1-shot impact effect (flash + shake + particle burst -> hard freeze + score overlay)
      setBgState('impact');
    });

    initRound();

    return () => {
      unsubWand();
      unsubSegment();
      unsubWin();
      unsubFail();
      ws.disconnect();
    };
  }, [initRound]);

  // Callback when impact effect completes (2s elapsed) -> show score box on top of frozen state
  const handleImpactComplete = useCallback(() => {
    setBgState('frozen');
    setShowScore(true);
  }, []);

  // Timer Expiration Callback
  const handleTimerExpire = useCallback(() => {
    if (bgState === 'settled' || bgState === 'turning') {
      wsRef.current?.triggerFail('time_expired');
    }
  }, [bgState]);

  // ---- Test & Simulation Controls ----
  const handleSimulateNextConnection = () => {
    if (!constellation) return;
    const conns = constellation.connections;
    if (connectedSegments.length < conns.length) {
      const nextConn = conns[connectedSegments.length];
      wsRef.current?.triggerSegmentSuccess(nextConn.from, nextConn.to);
    } else {
      wsRef.current?.triggerWin(98);
    }
  };

  const handleSimulateWandMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    wsRef.current?.updatePointerPosition(x, y, wandPointer.isDrawing);
  };

  return (
    <div
      className="starlink-view"
      onMouseMove={handleSimulateWandMove}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#030712',
        userSelect: 'none',
      }}
    >
      {/* 1. Starfield Canvas Background Engine */}
      <StarfieldCanvas
        ref={starfieldRef}
        state={bgState}
        turnDirection={turnDir}
        onImpactComplete={handleImpactComplete}
      />

      {/* 2. Constellation & Snapped Line Layer (Hidden during Warp-In) */}
      {constellation && (
        <ConstellationLayer
          stars={constellation.stars}
          connectedSegments={connectedSegments}
          wandPointer={wandPointer}
          activeStarId={activeStarId}
          opacity={bgState !== 'warping' ? 1 : 0}
        />
      )}

      {/* 3. Wand Cursor Layer */}
      <WandCursor pointer={wandPointer} />

      {/* 4. Host-driven Synchronized Timer */}
      {hostTimerData && !showScore && (
        <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 20 }}>
          <HostTimer
            startTime={hostTimerData.startTime}
            duration={hostTimerData.duration}
            onExpire={handleTimerExpire}
          />
        </div>
      )}

      {/* 5. Score Overlay Box (Mounts on Win sustained warp or Fail frozen state) */}
      {showScore && (
        <ScoreOverlay
          score={score}
          isWin={isWin}
          onRestart={initRound}
        />
      )}

      {/* 6. Interactive Test / Debug Toolbar */}
      <div
        className="debug-toolbar"
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          display: 'flex',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(5, 8, 20, 0.85)',
          border: '1px solid rgba(244, 213, 141, 0.4)',
          borderRadius: '30px',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          onClick={() => setBgState('warping')}
          style={btnStyle}
        >
          🚀 Warp-In
        </button>
        <button
          onMouseDown={() => setTurnDir(-1)}
          onMouseUp={() => setTurnDir(0)}
          style={btnStyle}
        >
          ⮌ Turn Left
        </button>
        <button
          onMouseDown={() => setTurnDir(1)}
          onMouseUp={() => setTurnDir(0)}
          style={btnStyle}
        >
          Turn Right ⮞
        </button>
        <button
          onClick={() =>
            wsRef.current?.updatePointerPosition(
              wandPointer.x,
              wandPointer.y,
              !wandPointer.isDrawing
            )
          }
          style={{ ...btnStyle, color: wandPointer.isDrawing ? '#F4D58D' : '#70A1FF' }}
        >
          {wandPointer.isDrawing ? '✏️ Drawing ON' : '✏️ Drawing OFF'}
        </button>
        <button onClick={handleSimulateNextConnection} style={btnStyle}>
          ✨ Connect Segment
        </button>
        <button onClick={() => wsRef.current?.triggerWin(95)} style={{ ...btnStyle, borderColor: '#F4D58D' }}>
          🏆 Test Win
        </button>
        <button onClick={() => wsRef.current?.triggerFail('impact')} style={{ ...btnStyle, borderColor: '#E5484D', color: '#E5484D' }}>
          💥 Test Fail
        </button>
        <button onClick={initRound} style={btnStyle}>
          🔄 Reset Round
        </button>
        {onReturnMenu && (
          <button onClick={onReturnMenu} style={{ ...btnStyle, opacity: 0.7 }}>
            ❌ Exit
          </button>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '16px',
  color: '#F1F0EC',
  padding: '6px 12px',
  fontSize: '0.8rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease',
};
