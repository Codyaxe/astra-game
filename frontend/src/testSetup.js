/**
 * testSetup.js — Vitest global setup file
 * Extends expect with DOM matchers and provides mocks for Canvas / RAF in jsdom.
 */

import '@testing-library/jest-dom';
import React from 'react';

globalThis.React = React;

// Mock Canvas 2D context for Vitest jsdom environment
if (typeof window !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawFocusIfNeeded: () => {},
    clip: () => {},
    createPattern: () => null,
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    createRadialGradient: () => ({
      addColorStop: () => {},
    }),
  });

  window.requestAnimationFrame = (callback) => setTimeout(callback, 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
}
