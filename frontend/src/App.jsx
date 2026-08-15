/**
 * App.jsx â€” Master Router and State Manager
 *
 * Flow:
 *  - Default: Show idle attract / title screen (waiting for QR scan)
 *  - QR ticket 2 scanned ? redirected here with ?autostart=true&...params
 *    ? register player in game DB ? GameReadyScreen (tap + countdown)
 *    ? Challenge ? Leaderboard ? back to Title
 *
 * NO manual registration forms. The game only starts via QR ticket redirect.
 */
import { useState, useEffect, useCallback } from 'react';
import { getConstellations, registerPlayer } from './services/api';
import { preloadAll } from './utils/audio';
import { ASSETS } from './data/assets';
import { DEFAULT_CONSTELLATIONS } from './data/defaultConstellations';
import TitleScreen from './screens/TitleScreen';
import LoadingScreen from './screens/LoadingScreen';
import GameReadyScreen from './screens/GameReadyScreen';
import ChallengeScreen from './screens/ChallengeScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

export default function App() {
  const isAutostart = new URLSearchParams(window.location.search).get('autostart') === 'true';
  const [screen, setScreen] = useState(isAutostart ? 'loading' : 'title');
  const [player, setPlayer] = useState(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [lastAttemptResult, setLastAttemptResult] = useState(null);
  const [autostartData, setAutostartData] = useState(null);
  const [constellations, setConstellations] = useState(DEFAULT_CONSTELLATIONS);
  const [constellationIndex, setConstellationIndex] = useState(0);

  // Preload SFX

  useEffect(() => {
    preloadAll(ASSETS.sfx);
  }, []);

  // Async background sync with backend

  useEffect(() => {
    getConstellations()
      .then((res) => {
        const valid = (res.constellations || []).filter(
          (c) => Array.isArray(c.star_nodes) && c.star_nodes.length >= 2
        );
        if (valid.length > 0) setConstellations(valid);
      })
      .catch(() => {});
  }, []);

  // ---- Handlers ----

  const handleRegistered = useCallback((playerData, attemptsRemaining) => {
    setPlayer(playerData);
    setAttemptNumber(3 - attemptsRemaining);
    setConstellationIndex(0);
    setScreen('challenge');
  }, []);

  const handleChallengeComplete = useCallback((result) => {
    setLastAttemptResult(result);
    if (result?.attempts_used !== undefined) {
      setPlayer((prev) => prev
        ? { ...prev, total_attempts_used: result.attempts_used, best_score: result.best_score }
        : prev
      );
    }
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

    const regUrl = import.meta.env.VITE_REGISTRATION_URL || 'http://192.168.1.11:5174';
    window.location.href = `${regUrl}/?mode=scanner`;
  }, []);

  // Autostart: handle ?autostart=true redirect from registration app

  useEffect(() => {
    if (!isAutostart) {
      const regUrl = import.meta.env.VITE_REGISTRATION_URL || 'http://192.168.1.11:5174';
      window.location.href = `${regUrl}/?mode=scanner`;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const firstName = params.get('first_name') || '';
    const lastName  = params.get('last_name')  || '';
    const srCode    = params.get('sr_code')    || '';
    const course    = params.get('course')     || 'N/A';
    const contactNumber = params.get('contact_number') || '';
    const mi        = params.get('mi')         || '';
    const department = params.get('department') || params.get('dept') || '';
    const yearLevel = params.get('year_level') || '';
    const section   = params.get('section')    || '';
    const attemptsRemaining = parseInt(params.get('attempts_remaining') || '3', 10);
    if (!srCode || !firstName || !lastName) {
      setScreen('title');
      return;
    }
    registerPlayer({ firstName, lastName, srCode, course, contactNumber, mi, department, yearLevel, section })
      .then((res) => {
        // Clean URL bar
        window.history.replaceState({}, document.title,
          window.location.protocol + '//' + window.location.host + window.location.pathname);

        const remaining = attemptsRemaining > 0 ? attemptsRemaining : (res.attempts_remaining ?? 0);
        if (remaining <= 0) {
          setPlayer(res.player);
          setScreen('leaderboard');
        } else {
          setAutostartData({ player: res.player, attemptsRemaining: remaining });
          setScreen('autostart_ready');
        }
      })
      .catch((err) => {
        console.error('Autostart failed:', err);
        setScreen('title');
      });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentConstellation = constellations[constellationIndex] || null;

  // ---- Router ----

  switch (screen) {
    case 'title':
      return <TitleScreen />;
    case 'loading':
      return <LoadingScreen message="Loading constellation challenge..." />;
    case 'autostart_ready':
      return (
        <GameReadyScreen
          player={autostartData?.player}
          onStart={() => handleRegistered(autostartData.player, autostartData.attemptsRemaining)}
        />
      );
    case 'challenge':
      if (!currentConstellation) {
        return <LoadingScreen message="Preparing stars..." />;
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
      return <TitleScreen />;
  }
}