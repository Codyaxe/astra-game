/**
 * App.jsx — Master Unified Router and State Manager for Astra
 *
 * All-In-One Unified Application:
 *  - Title Attract Screen
 *  - Live QR Ticket Scanner Kiosk
 *  - ID Card OCR & Mobile Registration Form
 *  - Admin Player & Ticket Management Dashboard
 *  - High Score Leaderboard
 *  - Interactive Gesture Constellation Tracing Challenge
 */
import { useState, useEffect, useCallback } from 'react';
import { getConstellations, registerPlayer } from './services/api';
import { preloadAll } from './utils/audio';
import { ASSETS } from './data/assets';
import { DEFAULT_CONSTELLATIONS } from './data/defaultConstellations';

import TitleScreen from './screens/TitleScreen';
import ScannerScreen from './screens/ScannerScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import LoadingScreen from './screens/LoadingScreen';
import GameReadyScreen from './screens/GameReadyScreen';
import ChallengeScreen from './screens/ChallengeScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

export default function App() {
  const [screen, setScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === 'true') return 'loading';
    if (params.get('mode') === 'scanner') return 'scanner';
    if (params.get('mode') === 'register') return 'register';
    if (params.get('mode') === 'dashboard') return 'dashboard';
    if (params.get('mode') === 'leaderboard') return 'leaderboard';
    return 'title';
  });

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

  // Async background sync with backend for dynamic constellations
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

  // ---- Navigation Handlers ----

  const handleRegistered = useCallback((playerData, attemptsRemaining) => {
    setPlayer(playerData);
    const rem = attemptsRemaining !== undefined ? attemptsRemaining : 3;
    setAttemptNumber(Math.max(1, 4 - rem));
    setConstellationIndex(0);
    setScreen('challenge');
  }, []);

  const handleQuickPlay = useCallback(() => {
    const guestPlayer = {
      id: 9999,
      first_name: 'Guest',
      last_name: 'Explorer',
      sr_code: 'GUEST-01',
      course: 'BSCS',
      department: 'CICS',
      total_attempts_used: 0,
      best_score: 0,
    };
    setPlayer(guestPlayer);
    setAttemptNumber(1);
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
  }, []);

  // Autostart handler if launched via QR Ticket URL redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') !== 'true') return;

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
        window.history.replaceState({}, document.title, window.location.pathname);

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
  }, []);

  const currentConstellation = constellations[constellationIndex] || null;

  // ---- Unified Router ----

  switch (screen) {
    case 'title':
      return (
        <TitleScreen
          onOpenScanner={() => setScreen('scanner')}
          onOpenRegister={() => setScreen('register')}
          onOpenLeaderboard={() => setScreen('leaderboard')}
          onOpenDashboard={() => setScreen('dashboard')}
          onQuickPlay={handleQuickPlay}
        />
      );

    case 'scanner':
      return (
        <ScannerScreen
          onBack={() => setScreen('title')}
          onStartGame={handleRegistered}
        />
      );

    case 'register':
      return (
        <RegisterScreen
          onBack={() => setScreen('title')}
          onOpenScanner={() => setScreen('scanner')}
          onOpenDashboard={() => setScreen('dashboard')}
          onStartGame={handleRegistered}
        />
      );

    case 'dashboard':
      return (
        <DashboardScreen
          onBack={() => setScreen('title')}
        />
      );

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
      return (
        <ChallengeScreen
          player={player}
          constellation={currentConstellation}
          constellationIndex={constellationIndex}
          totalConstellations={constellations.length}
          attemptNumber={attemptNumber}
          onComplete={handleChallengeComplete}
          onDisqualified={handleForceExitOrDisqualified}
          onForceExit={handleForceExitOrDisqualified}
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
      return <TitleScreen onQuickPlay={handleQuickPlay} onOpenScanner={() => setScreen('scanner')} />;
  }
}