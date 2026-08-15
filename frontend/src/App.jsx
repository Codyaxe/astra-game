/**
 * App.jsx — Master Router and State Manager:
 * - Kiosk Flow: Title -> Menu -> Register (OCR/Ticket) -> Challenge (Attempts 1-3) -> Leaderboard -> Retry/Title
 * - Mobile Fallback Flow: ?mode=mobile -> MobileRegisterScreen with auto-downloaded QR Ticket
 */

import { useState, useEffect, useCallback } from 'react';
import { getConstellations } from './services/api';
import { preloadAll } from './utils/audio';
import { ASSETS } from './data/assets';
import { DEFAULT_CONSTELLATIONS } from './data/defaultConstellations';

import TitleScreen from './screens/TitleScreen';
import MenuScreen from './screens/MenuScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import MobileRegisterScreen from './screens/MobileRegisterScreen';
import LoadingScreen from './screens/LoadingScreen';
import ChallengeScreen from './screens/ChallengeScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

export default function App() {
  const isMobileUrl = new URLSearchParams(window.location.search).get('mode') === 'mobile';
  const [screen, setScreen] = useState(isMobileUrl ? 'mobile_register' : 'title');

  const [player, setPlayer] = useState(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [lastAttemptResult, setLastAttemptResult] = useState(null);

  // Initialize with local constellations instantly — NO WAITING / NO DELAY!
  const [constellations, setConstellations] = useState(DEFAULT_CONSTELLATIONS);
  const [constellationIndex, setConstellationIndex] = useState(0);

  // Preload SFX
  useEffect(() => {
    preloadAll(ASSETS.sfx);
  }, []);

  // Async background sync with backend (filter out empty placeholder constellations)
  useEffect(() => {
    getConstellations()
      .then((res) => {
        const valid = (res.constellations || []).filter(
          (c) => Array.isArray(c.star_nodes) && c.star_nodes.length >= 2
        );
        if (valid.length > 0) {
          setConstellations(valid);
        }
      })
      .catch(() => {});
  }, []);

  // ---- Screen Navigation Handlers ----

  const handleTitleStart = useCallback(() => setScreen('menu'), []);
  const handlePlay = useCallback(() => setScreen('register'), []);
  const handleLeaderboard = useCallback(() => setScreen('leaderboard'), []);
  const handleGoToMobileView = useCallback(() => setScreen('mobile_register'), []);

  const handleRegistered = useCallback((playerData, attemptsRemaining) => {
    setPlayer(playerData);
    const currentAttempt = 3 - attemptsRemaining;
    setAttemptNumber(currentAttempt);
    setConstellationIndex(0);
    setScreen('challenge');
  }, []);

  const handleChallengeComplete = useCallback((result) => {
  setLastAttemptResult(result);

  // Update the local player state with the latest attempt information
  if (result?.attempts_used !== undefined) {
    setPlayer((prev) =>
      prev
        ? {
            ...prev,
            total_attempts_used: result.attempts_used,
            best_score: result.best_score,
          }
        : prev
    );
  }

  // Next constellation in chain or finish attempt
  if (constellationIndex + 1 < constellations.length) {
    setConstellationIndex((idx) => idx + 1);
  } else {
    setScreen('leaderboard');
  }
}, [constellationIndex, constellations.length]);

  const handleForceExitOrDisqualified = useCallback((result) => {
  setLastAttemptResult(result);
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

  // ---- Router Render ----
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
          onMobileQrFallback={handleGoToMobileView}
        />
      );

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
          key={`${player?.id || 'guest'}-${currentConstellation.id || constellationIndex}-${attemptNumber}`}
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
          onRetry={handleRetryNextAttempt}
          onReturnToTitle={handleReturnToTitle}
        />
      );

    default:
      return <TitleScreen onStart={handleTitleStart} />;
  }
}
