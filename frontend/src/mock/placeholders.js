/**
 * placeholders.js — Pure static mock placeholders for isolated component testing.
 * Allows rendering visual components anywhere without backend dependencies.
 */

export const PLACEHOLDER_STARS = [
  { id: 1, label: "Alpha (Head)", x: 0.25, y: 0.35, isHead: true },
  { id: 2, label: "Beta", x: 0.40, y: 0.25 },
  { id: 3, label: "Gamma", x: 0.55, y: 0.45 },
  { id: 4, label: "Delta", x: 0.70, y: 0.30 },
  { id: 5, label: "Epsilon", x: 0.82, y: 0.55 },
];

export const PLACEHOLDER_CONNECTIONS = [
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 3, to: 4 },
];

export const PLACEHOLDER_WAND_POINTER = {
  x: 0.48,
  y: 0.40,
  isDrawing: true,
};

export const PLACEHOLDER_WIN_SCORE = {
  score: 98,
  isWin: true,
  summary: "Hyper-navigation successful! Constellation linked.",
};

export const PLACEHOLDER_FAIL_SCORE = {
  score: 42,
  isWin: false,
  summary: "Navigation disrupted. Spacecraft impact recorded.",
};

export const PLACEHOLDER_HOST_TIMER = {
  startTime: Date.now() - 5000, // 5 seconds elapsed
  duration: 45, // 45 seconds total
};
