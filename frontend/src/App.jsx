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
import StarLinkView from './screens/StarLinkView';
import UnitTestHarness from './screens/UnitTestHarness';
import StarfieldCanvas from './components/starlink/StarfieldCanvas';
import ShipCockpitViewport from './components/starlink/ShipCockpitViewport';

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
    'starlink',
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

  const [constellations, setConstellations] = useState(
    isPreviewMode && screenParam === 'challenge' ? PREVIEW_CONSTELLATIONS : []
  );
  const [constellationIndex, setConstellationIndex] = useState(0);

  // Preload SFX
  useEffect(() => {
    preloadAll(ASSETS.sfx);
  }, []);

  // Fetch constellations
  useEffect(() => {
    if (isPreviewMode && screenParam === 'challenge') return;

    getConstellations()
      .then((res) => {
        if (res.constellations && res.constellations.length > 0) {
          setConstellations(res.constellations);
        }
      })
      .catch(console.error);
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

  // ---- Screen Navigation Handlers ----

  const handleTitleStart = useCallback(() => setScreen('menu'), []);
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

  const handleChallengeComplete = useCallback((result) => {
    setLastAttemptResult(result);
    // Next constellation in chain or finish attempt
    if (constellationIndex + 1 < constellations.length) {
      setConstellationIndex((idx) => idx + 1);
    } else {
      setScreen('leaderboard');
    }
  }, [constellationIndex, constellations.length]);

  const handleForceExitOrDisqualified = useCallback(() => {
    setScreen('leaderboard');
  }, []);

  const handleRetryNextAttempt = useCallback(() => {
    setAttemptNumber((prev) => prev + 1);
    setConstellationIndex(0);
    setScreen('challenge');
  }, []);

  const handleReturnToTitle = useCallback(() => {
    setPlayer(null);
    setLastAttemptResult(null);
    setConstellationIndex(0);
    setScreen('title');
  }, []);

  const currentConstellation = constellations[constellationIndex] || null;

  // Derive global canvas state based on active screen
  const bgState = screen === 'loading' ? 'warping' : screen === 'challenge' ? 'settled' : 'idle';
  const showGlobalBackground = screen !== 'starlink' && screen !== 'unittest' && screen !== 'mobile_register';

  // Screen router rendering helper
  const renderScreen = () => {
    switch (screen) {
      case 'mobile_register':
        return <MobileRegisterScreen onBackToKiosk={() => setScreen('title')} />;

      case 'title':
        return <TitleScreen onStart={handleTitleStart} />;

      case 'menu':
        return (
          <MenuScreen
            onPlay={handlePlay}
            onLeaderboard={handleLeaderboard}
            onStarLink={() => setScreen('starlink')}
            onUnitTest={() => setScreen('unittest')}
            onMobileQrFallback={handleGoToMobileView}
          />
        );

      case 'starlink':
        return <StarLinkView onReturnMenu={() => setScreen('menu')} />;

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
        return <LoadingScreen message="Loading constellation challenge…" />;

      case 'challenge':
        if (!currentConstellation) {
          return <LoadingScreen message="Preparing stars…" />;
        }
        return (
          <ChallengeScreen
            player={player}
            constellationData={currentConstellation}
            attemptNumber={attemptNumber}
            onComplete={handleChallengeComplete}
            onForceExit={handleForceExitOrDisqualified}
            onDisqualified={handleForceExitOrDisqualified}
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

          {/* Cockpit Viewport Overlay — Only appears in-game during challenge mode! */}
          {screen === 'challenge' && <ShipCockpitViewport />}
        </>
      )}

      {/* Active Screen Overlay Layer */}
      <div className="app-screen-layer" style={{ position: 'relative', zIndex: 20, width: '100%', height: '100%' }}>
        {renderScreen()}
      </div>
    </div>
  );
}
