/**
 * useGameState.js — Central game state management hook.
 *
 * Tracks the current screen, player data, active constellation,
 * session telemetry, and provides transition helpers.
 */

import { useState, useCallback } from 'react';

/**
 * Possible screens:
 *   'title' | 'menu' | 'loading' | 'register' | 'challenge' | 'leaderboard'
 */
const INITIAL_STATE = {
  screen: 'title',
  player: null,             // { id, full_name, sr_code, course, contact_number }
  sessionId: null,
  constellationIndex: 0,
  constellations: [],       // fetched from backend
  telemetry: {
    wrongConnections: 0,
    totalClicks: 0,
    wandPoints: [],         // [{ x, y }, ...]
    startTime: null,
  },
};

export function useGameState() {
  const [state, setState] = useState(INITIAL_STATE);

  // ---- Screen transitions ----

  const goTo = useCallback((screen) => {
    setState((prev) => ({ ...prev, screen }));
  }, []);

  // ---- Player ----

  const setPlayer = useCallback((player) => {
    setState((prev) => ({ ...prev, player }));
  }, []);

  // ---- Session ----

  const setSessionId = useCallback((sessionId) => {
    setState((prev) => ({ ...prev, sessionId }));
  }, []);

  // ---- Constellations ----

  const setConstellations = useCallback((constellations) => {
    setState((prev) => ({ ...prev, constellations, constellationIndex: 0 }));
  }, []);

  const nextConstellation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      constellationIndex: prev.constellationIndex + 1,
    }));
  }, []);

  const currentConstellation = state.constellations[state.constellationIndex] || null;

  // ---- Telemetry ----

  const resetTelemetry = useCallback(() => {
    setState((prev) => ({
      ...prev,
      telemetry: { ...INITIAL_STATE.telemetry, startTime: Date.now() },
    }));
  }, []);

  const addWrongConnection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      telemetry: {
        ...prev.telemetry,
        wrongConnections: prev.telemetry.wrongConnections + 1,
      },
    }));
  }, []);

  const addClick = useCallback(() => {
    setState((prev) => ({
      ...prev,
      telemetry: {
        ...prev.telemetry,
        totalClicks: prev.telemetry.totalClicks + 1,
      },
    }));
  }, []);

  const addWandPoint = useCallback((point) => {
    setState((prev) => ({
      ...prev,
      telemetry: {
        ...prev.telemetry,
        wandPoints: [...prev.telemetry.wandPoints, point],
      },
    }));
  }, []);

  // ---- Full reset ----

  const resetGame = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    currentConstellation,
    goTo,
    setPlayer,
    setSessionId,
    setConstellations,
    nextConstellation,
    resetTelemetry,
    addWrongConnection,
    addClick,
    addWandPoint,
    resetGame,
  };
}
