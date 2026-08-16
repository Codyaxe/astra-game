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
  const [sessionPlaylist, setSessionPlaylist] = useState([]);
  const [isScoreExiting, setIsScoreExiting] = useState(false);

  // Preload audio & fetch real constellations from backend
  useEffect(() => {
    preloadAll(ASSETS.sfx);

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

  // Global Admin Settings (Control Mode, Webcam Preview, Level Count, Snapping Multiplier)
  const [gameSettings, setGameSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('astra_game_settings');
      return saved ? JSON.parse(saved) : { controlMode: 'hybrid', showCamPip: false, levelsPerSession: 3, snappingRadiusMultiplier: 1.0 };
    } catch {
      return { controlMode: 'hybrid', showCamPip: false, levelsPerSession: 3, snappingRadiusMultiplier: 1.0 };
    }
  });

  const handleUpdateSettings = useCallback((newSettings) => {
    setGameSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('astra_game_settings', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  /**
   * Generates a dynamic session playlist:
   * 1. Aries is ALWAYS Stage 1 (Tutorial).
   * 2. Remaining stages are randomly selected and shuffled from the database seed.
   * 3. Length of playlist conforms to gameSettings.levelsPerSession (default: 3).
   */
  const generateSessionPlaylist = useCallback(() => {
    const allPool = constellations.length > 0 ? constellations : DEFAULT_CONSTELLATIONS;
    const aries = allPool.find((c) => c.name?.toLowerCase().includes('aries')) || allPool[0];
    const others = allPool.filter((c) => c !== aries);

    // Fisher-Yates shuffle remaining constellations
    const shuffled = [...others].sort(() => Math.random() - 0.5);

    const totalLevels = Math.max(1, Math.min(gameSettings.levelsPerSession || 3, allPool.length));
    const chosenList = [aries, ...shuffled.slice(0, totalLevels - 1)];

    console.log('%c[ASTRA] 🌌 Generated Session Playlist:', 'color: #38bdf8; font-weight: bold;', chosenList.map((c, i) => `${i + 1}. ${c.name}`));
    setSessionPlaylist(chosenList);
    return chosenList;
  }, [constellations, gameSettings.levelsPerSession]);

  // ---- Navigation Handlers ----

  const handleRegistered = useCallback((playerData, attemptsRemaining) => {
    setPlayer(playerData);
    const rem = attemptsRemaining !== undefined ? attemptsRemaining : 3;
    setAttemptNumber(Math.max(1, 4 - rem));
    setSessionStageScores([]);
    generateSessionPlaylist();
    setConstellationIndex(0);
    setScreen('loading');
  }, [generateSessionPlaylist]);

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
    setSessionStageScores([]);
    generateSessionPlaylist();
    setConstellationIndex(0);
    setScreen('loading');
  }, [generateSessionPlaylist]);

  const [isStageWarping, setIsStageWarping] = useState(false);
  const [sessionStageScores, setSessionStageScores] = useState([]);

  const activePlaylist = sessionPlaylist.length > 0 ? sessionPlaylist : constellations;
  const currentConstellation = activePlaylist[constellationIndex] || activePlaylist[0];

  const handleChallengeComplete = useCallback((result) => {
    setIsStageWarping(false);
    const stageScore = typeof result?.score === 'number' ? result.score : 100.0;
    const updatedScores = [...sessionStageScores, stageScore];
    setSessionStageScores(updatedScores);

    // Compute fair normalized average percentage across all completed stages
    const averageScore = Math.round((updatedScores.reduce((a, b) => a + b, 0) / updatedScores.length) * 10) / 10;
    const finalResult = {
      ...(result || {}),
      stage_score: stageScore,
      score: averageScore,
      total_stages_cleared: updatedScores.length,
    };

    setLastAttemptResult(finalResult);

    if (result?.attempts_used !== undefined) {
      setPlayer((prev) => prev
        ? { ...prev, total_attempts_used: result.attempts_used, best_score: Math.max(prev.best_score || 0, averageScore) }
        : prev
      );
    }

    // Check if more constellations remain in the active session playlist
    const currentList = sessionPlaylist.length > 0 ? sessionPlaylist : constellations;
    if (constellationIndex + 1 < currentList.length) {
      console.log('%c[ASTRA] 🚀 Stage Solved -> Warping to next randomized constellation:', 'color: #4ade80; font-weight: bold;', {
        stageScore: `${stageScore}%`,
        runningSessionAverage: `${averageScore}%`,
        nextStage: currentList[constellationIndex + 1]?.name,
      });
      setConstellationIndex((idx) => idx + 1);
      setScreen('loading'); // 👈 Shows the Hyperspace Warp Loading screen between levels!
    } else {
      // Completed all session constellations -> Show Final Round Normalized Score
      console.log('%c[ASTRA] 🏆 All Session Constellations Cleared -> Final Normalized Session Score:', 'color: #facc15; font-weight: bold;', `${averageScore}%`, updatedScores);
      setScreen('challenge_win_score');
    }
  }, [constellationIndex, sessionStageScores, sessionPlaylist, constellations]);

  const handleForceExitOrDisqualified = useCallback((result) => {
    setLastAttemptResult(result || { isWin: false, score: 0 });
    setScreen('challenge_fail');
  }, []);

  const handleRetryNextAttempt = useCallback(() => {
    setIsScoreExiting(false);
    setSessionStageScores([]);
    setAttemptNumber((prev) => prev + 1);
    generateSessionPlaylist();
    setConstellationIndex(0);
    setScreen('challenge');
  }, [generateSessionPlaylist]);

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

  // Derive global starfield warp state
  const bgState =
    isStageWarping ? 'sustained_warp'
    : screen === 'loading' ? 'warping'
    : screen === 'challenge_win' || screen === 'challenge_win_score' ? 'sustained_warp'
    : screen === 'challenge_fail' ? 'impact'
    : screen === 'challenge' ? 'settled'
    : 'idle';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0e1a' }}>
      {/* Global Starfield Background */}
      <StarfieldCanvas state={bgState} winDurationMs={6000} />

      {/* Global Cockpit Frame for In-Game screens */}
      {(screen === 'challenge' || screen === 'challenge_win_score' || screen === 'challenge_fail') && (
        <ShipCockpitViewport />
      )}

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
          constellations={constellations}
          gameSettings={gameSettings}
          onUpdateSettings={handleUpdateSettings}
          onLaunchChallenge={(stageIdx = 0, customPlayer = null) => {
            const playerToLaunch = customPlayer || {
              id: 9999,
              first_name: 'Admin',
              last_name: 'Tester',
              sr_code: 'ADMIN-01',
              course: 'BSCS',
              department: 'CICS',
              total_attempts_used: 0,
              best_score: 0,
            };
            setPlayer(playerToLaunch);
            const rem = customPlayer?.attempts_used !== undefined ? Math.max(0, 3 - customPlayer.attempts_used) : 3;
            setAttemptNumber(Math.max(1, 4 - rem));
            setSessionStageScores([]);
            generateSessionPlaylist();
            setConstellationIndex(stageIdx);
            setScreen('challenge');
          }}
        />
      )}

      {screen === 'loading' && (
        <LoadingScreen
          player={player}
          constellationName={currentConstellation?.name || 'ARIES (TUTORIAL)'}
          message="WARPING TO CELESTIAL COORDINATES…"
          duration={2200}
          onComplete={() => setScreen('challenge')}
        />
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
          totalConstellations={activePlaylist.length}
          attemptNumber={attemptNumber}
          controlMode={gameSettings.controlMode}
          showCamPip={gameSettings.showCamPip}
          difficulty={gameSettings.difficulty || 'easy'}
          gestureStyle={gameSettings.gestureStyle || 'point_auto'}
          allowFakeNodeTrace={gameSettings.allowFakeNodeTrace ?? true}
          snappingMode={gameSettings.snappingMode || 'sequential'}
          snappingRadiusMultiplier={gameSettings.snappingRadiusMultiplier || 1.0}
          onWinStart={() => setIsStageWarping(true)}
          onComplete={handleChallengeComplete}
          onDisqualified={handleForceExitOrDisqualified}
          onForceExit={handleForceExitOrDisqualified}
        />
      )}

      {(screen === 'challenge_win_score' || screen === 'challenge_fail') && (
        <ScoreOverlay
          score={lastAttemptResult?.score || lastAttemptResult?.attempt_score || (screen === 'challenge_win_score' ? 95 : 0)}
          isWin={screen === 'challenge_win_score'}
          player={player}
          remainingAttempts={Math.max(0, 3 - attemptNumber)}
          continueLabel={screen === 'challenge_fail' ? 'VIEW LEADERBOARD 🏆' : (constellationIndex + 1 < activePlaylist.length ? 'NEXT CONSTELLATION ⮞' : 'VIEW LEADERBOARD 🏆')}
          isExiting={isScoreExiting}
          onTryAgain={attemptNumber < 3 ? handleRetryNextAttempt : null}
          onContinue={() => {
            console.log('%c[ASTRA DIAGNOSTIC] 🚀 App.jsx onContinue triggered!', 'color: #4ade80; font-weight: bold;', {
              currentScreen: screen,
              constellationIndex,
              totalConstellations: activePlaylist.length,
              player,
              lastAttemptResult,
            });
            if (screen === 'challenge_fail') {
              console.log('%c[ASTRA DIAGNOSTIC] ➡️ Navigating directly to LEADERBOARD (Failure/Disqualified)', 'color: #f87171; font-weight: bold;');
              setScreen('leaderboard');
            } else if (constellationIndex + 1 < activePlaylist.length) {
              console.log('%c[ASTRA DIAGNOSTIC] ➡️ Advancing to next constellation stage index:', 'color: #facc15; font-weight: bold;', constellationIndex + 1);
              setConstellationIndex((idx) => idx + 1);
              setScreen('challenge');
            } else {
              console.log('%c[ASTRA DIAGNOSTIC] 🏁 Reached final round constellation! Navigating to LEADERBOARD 🏆', 'color: #38bdf8; font-weight: bold;');
              setScreen('leaderboard');
            }
          }}
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
