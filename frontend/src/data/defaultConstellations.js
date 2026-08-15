/**
 * defaultConstellations.js — Embedded fallback constellation dataset.
 * Guarantees zero loading delay for the star canvas.
 */

export const DEFAULT_CONSTELLATIONS = [
  {
    id: 1,
    name: 'Aries',
    head_node_id: 0,
    time_limit_sec: 20,
    star_nodes: [
      { id: 0, label: 'Hamal (A)',    x: 0.30, y: 0.40, next_node_id: 1,    hitbox_radius: 0.060 },
      { id: 1, label: 'Sheratan (B)', x: 0.45, y: 0.35, next_node_id: 2,    hitbox_radius: 0.060 },
      { id: 2, label: 'Mesarthim (C)',x: 0.60, y: 0.38, next_node_id: 3,    hitbox_radius: 0.060 },
      { id: 3, label: '41 Arietis (D)',x: 0.72, y: 0.44, next_node_id: null, hitbox_radius: 0.060 },
    ],
    fake_nodes: [
      { id: 100, x: 0.22, y: 0.58, hitbox_radius: 0.045 },
      { id: 101, x: 0.52, y: 0.22, hitbox_radius: 0.045 },
      { id: 102, x: 0.68, y: 0.65, hitbox_radius: 0.045 },
      { id: 103, x: 0.38, y: 0.68, hitbox_radius: 0.045 },
    ],
  },
  {
    id: 2,
    name: 'Big Dipper',
    head_node_id: 0,
    time_limit_sec: 30,
    star_nodes: [
      { id: 0, label: 'Alkaid', x: 0.20, y: 0.45, next_node_id: 1,    hitbox_radius: 0.060 },
      { id: 1, label: 'Mizar',  x: 0.32, y: 0.42, next_node_id: 2,    hitbox_radius: 0.060 },
      { id: 2, label: 'Alioth', x: 0.42, y: 0.38, next_node_id: 3,    hitbox_radius: 0.060 },
      { id: 3, label: 'Megrez', x: 0.54, y: 0.36, next_node_id: 4,    hitbox_radius: 0.060 },
      { id: 4, label: 'Phecda', x: 0.52, y: 0.52, next_node_id: 5,    hitbox_radius: 0.060 },
      { id: 5, label: 'Merak',  x: 0.68, y: 0.50, next_node_id: 6,    hitbox_radius: 0.060 },
      { id: 6, label: 'Dubhe',  x: 0.70, y: 0.34, next_node_id: null, hitbox_radius: 0.060 },
    ],
    fake_nodes: [
      { id: 104, x: 0.28, y: 0.60, hitbox_radius: 0.045 },
      { id: 105, x: 0.62, y: 0.20, hitbox_radius: 0.045 },
      { id: 106, x: 0.78, y: 0.55, hitbox_radius: 0.045 },
    ],
  },
  {
    id: 3,
    name: 'Orion',
    head_node_id: 0,
    time_limit_sec: 30,
    star_nodes: [
      { id: 0, label: 'Betelgeuse', x: 0.35, y: 0.25, next_node_id: 1,    hitbox_radius: 0.060 },
      { id: 1, label: 'Bellatrix',  x: 0.60, y: 0.23, next_node_id: 2,    hitbox_radius: 0.060 },
      { id: 2, label: 'Alnitak',    x: 0.44, y: 0.48, next_node_id: 3,    hitbox_radius: 0.060 },
      { id: 3, label: 'Alnilam',    x: 0.48, y: 0.49, next_node_id: 4,    hitbox_radius: 0.060 },
      { id: 4, label: 'Mintaka',    x: 0.52, y: 0.50, next_node_id: 5,    hitbox_radius: 0.060 },
      { id: 5, label: 'Saiph',      x: 0.38, y: 0.72, next_node_id: 6,    hitbox_radius: 0.060 },
      { id: 6, label: 'Rigel',      x: 0.62, y: 0.70, next_node_id: null, hitbox_radius: 0.060 },
    ],
    fake_nodes: [
      { id: 107, x: 0.20, y: 0.35, hitbox_radius: 0.045 },
      { id: 108, x: 0.75, y: 0.30, hitbox_radius: 0.045 },
      { id: 109, x: 0.50, y: 0.85, hitbox_radius: 0.045 },
    ],
  },
];
