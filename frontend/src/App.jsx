/**
 * App.jsx — Master Unified Router & Cockpit Stage for Astra
 *
 * Combines:
 * 1. Unified Kiosk Architecture (Title, Scanner, Register, Dashboard, Leaderboard)
 * 2. In-Game Spaceship Cockpit Viewport, Animated Starfield & Holographic Effects
 * 3. AI Voiceovers & Subtitle Dialogue Controller
 * 4. Flask Backend Integration (MySQL, OCR ID Scanner, QR Ticket Puncher)
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

import StarfieldCanvas from './components/starlink/StarfieldCanvas';
import ShipCockpitViewport from './components/starlink/ShipCockpitViewport';
import ScoreOverlay from './components/starlink/ScoreOverlay';
import EyelidBlinkOverlay from './components/starlink/EyelidBlinkOverlay';
import SubtitleOverlay from './components/dialogue/SubtitleOverlay';
import useDialogueController from './hooks/useDialogueController';
import { DIALOGUE_CONFIG } from './config/dialogueConfig';

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
  const [isScoreExiting, setIsScoreExiting] = useState(false);

  // Dialogue Controller for in-game voiceovers & subtitles
  const dialogue = useDialogueController(DIALOGUE_CONFIG);

  // Preload audio & fetch real constellations from backend
  useEffect(() => {
    preloadAll(ASSETS.audio);

    getConstellations()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setConstellations(data);
        }
      })
      .catch((err) => {
        console.warn('Backend unavailable, using default constellations:', err);
      });
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
    setLastAttemptResult(result || { isWin: true, score: 95 });
    if (result?.attempts_used !== undefined) {
      setPlayer((prev) => prev
        ? { ...prev, total_attempts_used: result.attempts_used, best_score: result.best_score }
        : prev
      );
    }
    setScreen('challenge_win_score');
  }, []);

  const handleForceExitOrDisqualified = useCallback((result) => {
    setLastAttemptResult(result || { isWin: false, score: 0 });
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

  // Derive global starfield warp state
  const bgState =
    screen === 'loading' ? 'warping'
    : screen === 'challenge_win' || screen === 'challenge_win_score' ? 'sustained_warp'
    : screen === 'challenge_fail' ? 'impact'
    : screen === 'challenge' ? 'settled'
    : 'idle';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0e1a' }}>
      {/* Global Starfield Background */}
      <StarfieldCanvas state={bgState} />

      {/* Global Cockpit Frame for In-Game screens */}
      {(screen === 'challenge' || screen === 'challenge_win_score' || screen === 'challenge_fail') && (
        <ShipCockpitViewport />
      )}

      {/* Subtitle Dialogue Overlay */}
      <SubtitleOverlay subtitle={dialogue.activeSubtitle} />

      {/* Screen Render Switch */}
      {screen === 'title' && (
        <TitleScreen
          onOpenScanner={() => setScreen('scanner')}
          onOpenRegister={() => setScreen('register')}
          onOpenLeaderboard={() => setScreen('leaderboard')}
          onOpenDashboard={() => setScreen('dashboard')}
          onQuickPlay={handleQuickPlay}
        />
      )}

      {screen === 'scanner' && (
        <ScannerScreen
          onBack={() => setScreen('title')}
          onStartGame={handleRegistered}
        />
      )}

      {screen === 'register' && (
        <RegisterScreen
          onBack={() => setScreen('title')}
          onOpenScanner={() => setScreen('scanner')}
          onOpenDashboard={() => setScreen('dashboard')}
          onStartGame={handleRegistered}
        />
      )}

      {screen === 'dashboard' && (
        <DashboardScreen
          onBack={() => setScreen('title')}
        />
      )}

      {screen === 'loading' && (
        <LoadingScreen message="Loading constellation challenge..." />
      )}

      {screen === 'autostart_ready' && (
        <GameReadyScreen
          player={autostartData?.player}
          onStart={() => handleRegistered(autostartData.player, autostartData.attemptsRemaining)}
        />
      )}

      {screen === 'challenge' && (
        <ChallengeScreen
          key={`challenge-${attemptNumber}-${constellationIndex}-${currentConstellation?.id || 0}`}
          player={player}
          constellation={currentConstellation}
          constellationData={currentConstellation}
          constellationIndex={constellationIndex}
          totalConstellations={constellations.length}
          attemptNumber={attemptNumber}
          onComplete={handleChallengeComplete}
          onDisqualified={handleForceExitOrDisqualified}
          onForceExit={handleForceExitOrDisqualified}
        />
      )}

      {(screen === 'challenge_win_score' || screen === 'challenge_fail') && (
        <ScoreOverlay
          score={lastAttemptResult?.score || lastAttemptResult?.attempt_score || 95}
          isWin={screen === 'challenge_win_score'}
          isExiting={isScoreExiting}
          onContinue={() => {
            if (constellationIndex + 1 < constellations.length) {
              setConstellationIndex((idx) => idx + 1);
              setScreen('challenge');
            } else {
              setScreen('leaderboard');
            }
          }}
          onReturnToTitle={handleReturnToTitle}
        />
      )}

      {screen === 'leaderboard' && (
        <LeaderboardScreen
          player={player}
          lastAttemptResult={lastAttemptResult}
          onRetry={handleRetryNextAttempt}
          onReturnToTitle={handleReturnToTitle}
        />
      )}
    </div>
  );
}
