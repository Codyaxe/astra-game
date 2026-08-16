/**
 * dialogueConfig.js — Central Dialogue & Audio Timing Configuration
 *
 * Easily adjust text display duration, audio file paths, gaps between lines,
 * and phase handoff delays for the Ship AI dialogue system.
 *
 * Audio MP3 files are loaded from /assets/audio/dialogue/[line_id].wav.
 * If an MP3 file is missing, the controller automatically falls back to textDurationMs.
 */

export const DIALOGUE_CONFIG = {
  // Phase A: Post-Title / Warp-In (Before Loading Briefing Overlay)
  phaseA: [
    {
      id: 'A1',
      speaker: 'SHIP AI',
      text: "Nav computer's fried, took the positioning sensors with it. I can't tell you where we are or where we're going.",
      audioPath: '/assets/audio/dialogue/A1.wav',
      textDurationMs: 8500,
      postDelayMs: 200,
    },
    {
      id: 'A2',
      speaker: 'SHIP AI',
      text: "There's a repair station within range. Problem is, I need a heading to reach it, and I can't calculate one blind.",
      audioPath: '/assets/audio/dialogue/A2.wav',
      textDurationMs: 9000,
      postDelayMs: 200,
    },
    {
      id: 'A3',
      speaker: 'SHIP AI',
      text: "There's a manual workaround — visual star navigation through constellations. Outdated, but it doesn't need the nav computer. Someone just has to trace the pattern by hand.",
      audioPath: '/assets/audio/dialogue/A3.wav',
      textDurationMs: 13000,
      postDelayMs: 200,
    },
  ],

  // Phase B: Briefing Overlay Active
  phaseB: [
    {
      id: 'B1',
      speaker: 'SHIP AI',
      text: "Take the wand. Point at the stars — not all of them are part of the constellation, so pick carefully. Connect the right ones, and I'll calculate our heading from the result.",
      audioPath: '/assets/audio/dialogue/B1.wav',
      textDurationMs: 12500,
      postDelayMs: 650,
    },
  ],

  // Phase C: In-Game Timer Triggers
  timeWarning20s: {
    id: 'C1',
    speaker: 'SHIP AI',
    text: "Time's tight. You'll want to move faster than that.",
    audioPath: '/assets/audio/dialogue/C1.wav',
    textDurationMs: 3200,
    postDelayMs: 200,
  },
  timeWarning10s: {
    id: 'C2',
    speaker: 'SHIP AI',
    text: "Power failing. Multiple systems offline. Move quickly.",
    audioPath: '/assets/audio/dialogue/C2.wav',
    textDurationMs: 3000,
    postDelayMs: 200,
  },

  // Phase D: Fail Sequence (Timer hits zero)
  phaseDFail: [
    {
      id: 'D1',
      speaker: 'SHIP AI',
      text: "That's not a match — that pattern's wrong—",
      audioPath: '/assets/audio/dialogue/D1.wav',
      textDurationMs: 2800,
      postDelayMs: 200,
    },
    {
      id: 'D2',
      speaker: 'SHIP AI',
      text: "—hull's breached, Brace for impac—",
      audioPath: '/assets/audio/dialogue/D2.wav',
      textDurationMs: 1800,
      postDelayMs: 0,
    },
  ],

  // Phase E: Win Sequence (Constellation Completed)
  phaseEWin: [
    {
      id: 'E1',
      speaker: 'SHIP AI',
      text: "Pattern's confirmed. That's a match.",
      audioPath: '/assets/audio/dialogue/E1.wav',
      textDurationMs: 2600,
      postDelayMs: 300,
    },
    {
      id: 'E2',
      speaker: 'SHIP AI',
      text: "Running the calculation now... heading locked. We know where we're going.",
      audioPath: '/assets/audio/dialogue/E2.wav',
      textDurationMs: 4200,
      postDelayMs: 300,
      triggers3DTurn: true, // Triggers 3D constellation turn animation during this line!
    },
    {
      id: 'E3',
      speaker: 'SHIP AI',
      text: "Good work. Let's move.",
      audioPath: '/assets/audio/dialogue/E3.wav',
      textDurationMs: 2200,
      postDelayMs: 400,
      triggersWarpStreaks: true, // Triggers hyperdrive warp streaks during this line!
    },
  ],
};
