/**
 * SFX / Asset Manifest
 *
 * Place your audio and image files in public/assets/ and reference them here.
 * All paths are relative to the public/ directory.
 *
 * REQUIRED ASSETS:
 *
 * Images:
 *   /assets/images/logo.png            — 1:1 logo
 *   /assets/images/logo_typography.png  — logo with typography
 *   /assets/images/star_node.png        — star/node sprite
 *   /assets/images/bg.png              — background texture / illustration
 *
 * SFX:
 *   /assets/sfx/correct.mp3           — right connection
 *   /assets/sfx/wrong.mp3             — wrong connection
 *   /assets/sfx/bg_music.mp3          — background music loop
 *   /assets/sfx/start.mp3             — game start chime
 *   /assets/sfx/timer_end.mp3         — timer expiry / disqualification
 */

export const ASSETS = {
  images: {
    logo:           '/assets/images/logo.png',
    logoTypography: '/assets/images/logo_typography.png',
    starNode:       '/assets/images/star_node.png',
    background:     '/assets/images/bg.png',
  },
  sfx: {
    correct:  '/assets/sfx/correct.mp3',
    wrong:    '/assets/sfx/wrong.mp3',
    bgMusic:  '/assets/sfx/bg_music.mp3',
    start:    '/assets/sfx/start.mp3',
    timerEnd: '/assets/sfx/timer_end.mp3',
  },
};
