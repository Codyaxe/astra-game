/**
 * audio.js — SFX and background music manager.
 */

const audioCache = {};

/**
 * Preload an audio file so it's ready to play instantly.
 * @param {string} key   — a short name to reference later
 * @param {string} src   — path relative to public/
 */
export function preload(key, src) {
  if (!audioCache[key]) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audioCache[key] = audio;
  }
}

/**
 * Play a preloaded sound effect (fire-and-forget).
 * @param {string} key
 */
export function playSfx(key) {
  const audio = audioCache[key];
  if (!audio) return;
  // Clone so overlapping plays are allowed
  const clone = audio.cloneNode();
  clone.volume = audio.volume;
  clone.play().catch(() => {});
}

/**
 * Start looping a preloaded audio track (e.g. background music).
 * @param {string} key
 * @param {number} volume  0–1
 */
export function playLoop(key, volume = 0.3) {
  const audio = audioCache[key];
  if (!audio) return;
  audio.loop = true;
  audio.volume = volume;
  audio.play().catch(() => {});
}

/**
 * Stop a looping track.
 * @param {string} key
 */
export function stopLoop(key) {
  const audio = audioCache[key];
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

export function preloadAll(sfxMap) {
  if (!sfxMap || typeof sfxMap !== 'object') return;
  for (const [key, src] of Object.entries(sfxMap)) {
    preload(key, src);
  }
}
