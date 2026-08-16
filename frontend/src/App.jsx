/**
 * App.jsx — Master Router and State Manager:
 * - Kiosk Flow: Title -> Menu -> Register (OCR/Ticket) -> Challenge (Attempts 1-3) -> Leaderboard -> Retry/Title
 * - Mobile Fallback Flow: ?mode=mobile -> MobileRegisterScreen with auto-downloaded QR Ticket
 */

import { useState, useEffect, useCallback } from 'react';
import { getConstellations } from './services/api';
import { preloadAll } from './utils/audio';
import { ASSETS } from './data/assets';

import TitleScreen from './screens/TitleScreen';
import MenuScreen from './screens/MenuScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import MobileRegisterScreen from './screens/MobileRegisterScreen';
import LoadingScreen from './screens/LoadingScreen';
import ChallengeScreen from './screens/ChallengeScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import UnitTestHarness from './screens/UnitTestHarness';
import StarfieldCanvas from './components/starlink/StarfieldCanvas';
import ShipCockpitViewport from './components/starlink/ShipCockpitViewport';
import HoloDeactivate from './components/HoloDeactivate';
import ScoreOverlay from './components/starlink/ScoreOverlay';
import EyelidBlinkOverlay from './components/starlink/EyelidBlinkOverlay';

const PREVIEW_CONSTELLATIONS = [
  {
    id: 999,
    name: 'Preview Orion',
    head_node_id: 0,
    time_limit_sec: 30,
    star_nodes: [
      { id: 0, label: 'A', x: 0.35, y: 0.25, next_node_id: 1, hitbox_radius: 0.055 },
      { id: 1, label: 'B', x: 0.55, y: 0.28, next_node_id: 2, hitbox_radius: 0.055 },
      { id: 2, label: 'C', x: 0.48, y: 0.5, next_node_id: 3, hitbox_radius: 0.055 },
      { id: 3, label: 'D', x: 0.62, y: 0.7, next_node_id: null, hitbox_radius: 0.055 },
    ],
    fake_nodes: [
      { id: 100, x: 0.2, y: 0.35, hitbox_radius: 0.045 },
      { id: 101, x: 0.72, y: 0.4, hitbox_radius: 0.045 },
      { id: 102, x: 0.4, y: 0.78, hitbox_radius: 0.045 },
    ],
  },
];

const PREVIEW_PLAYER = {
  id: 999,
  first_name: 'Preview',
  last_name: 'Player',
  sr_code: '23-00001',
  course: 'BSCS',
  qr_ticket_code: 'PREVIEW-TICKET-001',
  total_attempts_used: 1,
  best_score: 87,
};

const PREVIEW_RESULT = {
  attempts_used: 1,
  best_score: 87,
};

const PREVIEW_LEADERBOARD = [
  { player_id: 11, first_name: 'Ava', last_name: 'Reyes', sr_code: '22-10101', course: 'BSIT', attempts_used: 3, highest_score: 98 },
  { player_id: 12, first_name: 'Noah', last_name: 'Santos', sr_code: '22-20301', course: 'BSCS', attempts_used: 2, highest_score: 93 },
  { player_id: 999, first_name: 'Preview', last_name: 'Player', sr_code: '23-00001', course: 'BSCS', attempts_used: 1, highest_score: 87 },
];

export default function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const isMobileUrl = searchParams.get('mode') === 'mobile';
  const isPreviewMode = searchParams.get('preview') === '1';
  const screenParam = searchParams.get('screen');
  const allowedScreens = new Set([
    'title',
    'menu',
    'register',
    'mobile_register',
    'loading',
    'challenge',
    'leaderboard',
    'unittest',
  ]);

  const [screen, setScreen] = useState(() => {
    if (isMobileUrl) return 'mobile_register';
    if (isPreviewMode && allowedScreens.has(screenParam)) return screenParam;
    return 'title';
  });

  const [player, setPlayer] = useState(
    isPreviewMode && (screenParam === 'challenge' || screenParam === 'leaderboard')
      ? PREVIEW_PLAYER
      : null
  );
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [lastAttemptResult, setLastAttemptResult] = useState(
    isPreviewMode && screenParam === 'leaderboard' ? PREVIEW_RESULT : null
  );

  const [constellations, setConstellations] = useState(PREVIEW_CONSTELLATIONS);
  const [constellationIndex, setConstellationIndex] = useState(0);

  // Preload SFX
  useEffect(() => {
    preloadAll(ASSETS.sfx);
  }, []);

  // Fetch constellations from backend (falls back gracefully to demo constellation if backend offline)
  useEffect(() => {
    if (isPreviewMode && screenParam === 'challenge') return;

    getConstellations()
      .then((res) => {
        if (res && res.constellations && res.constellations.length > 0) {
          setConstellations(res.constellations);
        }
      })
      .catch((err) => {
        console.warn('Backend API offline — using offline demo constellation:', err);
      });
  }, [isPreviewMode, screenParam]);

  useEffect(() => {
    console.log("screen: ", screen);
    if (!isPreviewMode) return;

    if ((screen === 'challenge' || screen === 'leaderboard') && !player) {
      setPlayer(PREVIEW_PLAYER);
    }

    if (screen === 'challenge' && constellations.length === 0) {
      setConstellations(PREVIEW_CONSTELLATIONS);
      setConstellationIndex(0);
    }

    if (screen === 'leaderboard' && !lastAttemptResult) {
      setLastAttemptResult(PREVIEW_RESULT);
    }
  }, [screen, isPreviewMode, player, constellations.length, lastAttemptResult]);

  /**
   * SEQUENTIAL TRANSITION STATE MACHINE
   *
   * 'title'         → Click → 'title_exiting'   (title slides down, 850ms)
   * 'title_exiting' →        'visor'             (cockpit visor slides down, 900ms)
   * 'visor'         →        'loading'           (starfield warps, briefing overlay, 2500ms)
   * 'loading'       →        'challenge'         (cockpit game, timer starts)
   *
   * To connect backend: replace handleTitleStart with a real registration flow
   * that resolves player/constellation data, then calls setScreen('title_exiting').
   */

  // Step 1 → Step 2: After title slides down, lower the cockpit visor
  useEffect(() => {
    if (screen === 'title_exiting') {
      const timer = setTimeout(() => {
        setScreen('visor'); // Visor starts sliding down now
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Step 2 → Step 3: After visor settles, start the warp-in loading briefing
  useEffect(() => {
    if (screen === 'visor') {
      const timer = setTimeout(() => {
        setScreen('loading'); // Starfield starts warping now
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Step 3 → Step 3.5: After warp-in completes, trigger the HoloDeactivate exit animation
  useEffect(() => {
    if (screen === 'loading') {
      const timer = setTimeout(() => {
        setScreen('loading_exiting'); // starts holo CRT collapse animation
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [screen]);


  // Step 5b (FAIL): 2.8s Impact shake & cracked glass animation matching full eye blink closure
  useEffect(() => {
    if (screen === 'challenge_fail') {
      setIsScoreExiting(false);
      const timer = setTimeout(() => {
        setScreen('challenge_fail_score');
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Reset isScoreExiting whenever active screen changes away from score overlays
  useEffect(() => {
    if (screen === 'challenge' || screen === 'loading' || screen === 'title' || screen === 'leaderboard') {
      setIsScoreExiting(false);
    }
  }, [screen]);

  // Streamlined Title Screen Start — sets demo pilot + constellation data, starts sequential flow
  const handleTitleStart = useCallback(() => {
    const demoPlayer = {
      id: 'demo-pilot-01',
      first_name: 'JUAN',
      last_name: 'DELA CRUZ',
      sr_code: '22-10101',
      course: 'Computer Science',
    };
    const demoConstellation = {
      id: 'constellation-orion-demo',
      name: 'Orion (Demo)',
      head_node_id: 1,
      time_limit_sec: 30,
      star_nodes: [
        { id: 1, label: 'Alpha (Head)', x: 0.25, y: 0.35, next_node_id: 2, isHead: true },
        { id: 2, label: 'Beta', x: 0.40, y: 0.25, next_node_id: 3 },
        { id: 3, label: 'Gamma', x: 0.55, y: 0.45, next_node_id: 4 },
        { id: 4, label: 'Delta', x: 0.70, y: 0.30, next_node_id: 5 },
        { id: 5, label: 'Epsilon', x: 0.82, y: 0.55, next_node_id: null },
      ],
      fake_nodes: [
        { id: 99, x: 0.15, y: 0.70 },
        { id: 100, x: 0.85, y: 0.20 },
      ],
    };
    setPlayer(demoPlayer);
    setConstellations([demoConstellation]);
    setConstellationIndex(0);
    setScreen('title_exiting'); // STEP 1: Title slides down
  }, []);
  const handlePlay = useCallback(() => setScreen('register'), []);
  const handleLeaderboard = useCallback(() => setScreen('leaderboard'), []);
  const handleGoToMobileView = useCallback(() => setScreen('mobile_register'), []);

  const handleRegistered = useCallback((playerData, attemptsRemaining) => {
    setPlayer(playerData);
    const currentAttempt = (3 - attemptsRemaining) + 1;
    setAttemptNumber(currentAttempt);
    setConstellationIndex(0);
    setScreen('challenge');
  }, []);

  const [isScoreExiting, setIsScoreExiting] = useState(false);

  const handleChallengeComplete = useCallback((result) => {
    setLastAttemptResult(result || { isWin: true, score: 95 });
    setScreen('challenge_win_score');
  }, []);

  const handleForceExitOrDisqualified = useCallback((result) => {
    setLastAttemptResult(result || { isWin: false, score: 35 });
    setScreen('challenge_fail');
  }, []);

  const handleRetryNextAttempt = useCallback(() => {
    setIsScoreExiting(false);
    setAttemptNumber((prev) => prev + 1);
    setConstellationIndex(0);
    setScreen('challenge');
  }, []);

  const handleReturnToTitle = useCallback(() => {
    setIsScoreExiting(false);
    setPlayer(null);
    setLastAttemptResult(null);
    setConstellationIndex(0);
    setScreen('title');
  }, []);

  const currentConstellation = constellations[constellationIndex] || null;

  // Derive global canvas state based on active screen
  // 'title_exiting' and 'visor' keep starfield idle — warp only starts when 'loading' begins
  // 'loading_exiting' keeps starfield warping while the holo deactivation animation plays
  // 'challenge_win' and 'challenge_win_score' trigger and maintain sustained 3D warp fly-by streaks
  // 'challenge_fail' triggers screen shake, glass crack, red flash, then freezes ('frozen')
  const bgState =
    screen === 'loading' || screen === 'loading_exiting' ? 'warping'
    : screen === 'challenge_win' || screen === 'challenge_win_score' ? 'sustained_warp'
    : screen === 'challenge_fail' ? 'impact'
    : screen === 'challenge_fail_score' ? 'frozen'
    : screen === 'challenge' ? 'settled'
    : 'idle';
  const showGlobalBackground = screen !== 'unittest' && screen !== 'mobile_register';

  // Quick Play Demo Handler (No Backend Required!)
  const handleQuickPlay = () => {
    const demoPlayer = {
      id: 'demo-pilot-01',
      first_name: 'JUAN',
      last_name: 'DELA CRUZ',
      sr_code: '22-10101',
      course: 'Computer Science',
    };
    const demoConstellation = {
      id: 'constellation-orion-demo',
      name: 'Orion (Demo)',
      head_node_id: 1,
      time_limit_sec: 45,
      star_nodes: [
        { id: 1, label: 'Alpha (Head)', x: 0.25, y: 0.35, next_node_id: 2, isHead: true },
        { id: 2, label: 'Beta', x: 0.40, y: 0.25, next_node_id: 3 },
        { id: 3, label: 'Gamma', x: 0.55, y: 0.45, next_node_id: 4 },
        { id: 4, label: 'Delta', x: 0.70, y: 0.30, next_node_id: 5 },
        { id: 5, label: 'Epsilon', x: 0.82, y: 0.55, next_node_id: null },
      ],
      fake_nodes: [
        { id: 99, x: 0.15, y: 0.70 },
        { id: 100, x: 0.85, y: 0.20 },
      ],
    };
    setPlayer(demoPlayer);
    setConstellations([demoConstellation]);
    setConstellationIndex(0);
    setScreen('challenge');
  };

  // Screen router rendering helper
  const renderScreen = () => {
    switch (screen) {
      case 'mobile_register':
        return <MobileRegisterScreen onBackToKiosk={() => setScreen('title')} />;

      case 'title':
        return <TitleScreen onStart={handleTitleStart} isExiting={false} />;

      case 'title_exiting':
        // Title still visible but playing slide-down animation before visor mounts
        return <TitleScreen onStart={handleTitleStart} isExiting={true} />;

      case 'visor':
        // Title is gone — cockpit visor is lowering, starfield still idle
        return null;

      case 'menu':
        return (
          <MenuScreen
            onPlay={handlePlay}
            onQuickPlay={handleQuickPlay}
            onLeaderboard={handleLeaderboard}
            onUnitTest={() => setScreen('unittest')}
            onMobileQrFallback={handleGoToMobileView}
          />
        );

      case 'unittest':
        return <UnitTestHarness onExit={() => setScreen('menu')} />;

      case 'register':
        return (
          <RegistrationScreen
            onRegistered={handleRegistered}
            onGoToMobileUrl={handleGoToMobileView}
          />
        );

      case 'loading':
        return (
          <LoadingScreen
            message="Warping to celestial coordinates…"
            player={player}
            constellationName={currentConstellation?.name || 'ORION'}
          />
        );

      // Step 3.5: Holo CRT collapse animation plays before challenge mounts
      case 'loading_exiting':
        return (
          <LoadingScreen
            message="Warping to celestial coordinates…"
            player={player}
            constellationName={currentConstellation?.name || 'ORION'}
            isExiting={true}
            onExitComplete={() => setScreen('challenge')}
          />
        );

      case 'challenge':
      case 'challenge_win':
        if (!currentConstellation) {
          return <LoadingScreen message="Preparing stars…" />;
        }
        return (
          <ChallengeScreen
            player={player}
            constellationData={currentConstellation}
            attemptNumber={attemptNumber}
            onWinStart={() => setScreen('challenge_win')}
            onComplete={handleChallengeComplete}
            onForceExit={handleForceExitOrDisqualified}
            onDisqualified={handleForceExitOrDisqualified}
          />
        );

      case 'challenge_win_score':
        return (
          <ScoreOverlay
            score={lastAttemptResult?.score || 95}
            isWin={true}
            player={player}
            telemetry={lastAttemptResult?.telemetry}
            remainingAttempts={Math.max(0, 3 - attemptNumber)}
            onRestart={() => setIsScoreExiting(true)}
            isExiting={isScoreExiting}
            onExitComplete={() => setScreen('leaderboard')}
          />
        );

      case 'challenge_fail':
        // Impact screen shake & cracked glass animation plays on StarfieldCanvas
        return null;

      case 'challenge_fail_score':
        return (
          <ScoreOverlay
            score={lastAttemptResult?.score || 35}
            isWin={false}
            player={player}
            telemetry={lastAttemptResult?.telemetry}
            remainingAttempts={Math.max(0, 3 - attemptNumber)}
            onRestart={() => setIsScoreExiting(true)}
            isExiting={isScoreExiting}
            onExitComplete={() => setScreen('leaderboard')}
          />
        );


      case 'leaderboard':
        return (
          <LeaderboardScreen
            player={player}
            lastAttemptResult={lastAttemptResult}
            previewMode={isPreviewMode}
            previewLeaderboard={PREVIEW_LEADERBOARD}
            onRetry={handleRetryNextAttempt}
            onReturnToTitle={handleReturnToTitle}
          />
        );

      default:
        return <TitleScreen onStart={handleTitleStart} />;
    }
  };

  return (
    <div
      className="app-root-viewport"
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#030712',
      }}
    >
      {showGlobalBackground && (
        <>
          {/* Global Persistent Canvas Starfield (Never unmounts across screens) */}
          <StarfieldCanvas state={bgState} />

          {/* Cockpit Viewport Overlay — mounts at 'visor' and stays through loading, challenge, win, fail */}
          {(
            screen === 'visor' ||
            screen === 'loading' ||
            screen === 'loading_exiting' ||
            screen === 'challenge' ||
            screen === 'challenge_win' ||
            screen === 'challenge_win_score' ||
            screen === 'challenge_fail' ||
            screen === 'challenge_fail_score'
          ) && <ShipCockpitViewport />}

          {/* Outer Wilds First-Person Anatomical Eyelid Blink Overlay (Fires on Fail) */}
          <EyelidBlinkOverlay
            active={screen === 'challenge_fail' || screen === 'challenge_fail_score'}
            duration={2800}
          />
        </>
      )}

      {/* Active Screen Overlay Layer */}
      <div className="app-screen-layer" style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
        {renderScreen()}
      </div>
    </div>
  );
}
