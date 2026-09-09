/* ============================================================================
   BACKGROUND SEA LIFE
   Vanilla box models for the mobs that belong in water, drifting across the
   page behind the content. Part lists follow the game's own definitions:
   texOffs(u, v).addBox(x, y, z, w, h, d) at PartPose.offset(x, y, z).
   ========================================================================= */

import { buildModel } from './model.js';

const TAU = Math.PI * 2;

/* ---- Squid --------------------------------------------------------------
   One fat body and eight tentacles on a ring of radius 5, each turned to face
   outward. Exactly the model the game builds. */
function squidSpec() {
  const parts = [
    { name: 'body', uv: [0, 0], box: [-6, -8, -6, 12, 16, 12], pos: [0, 8, 0] },
  ];
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8;
    parts.push({
      name: `t${i}`,
      uv: [48, 0],
      box: [-1, 0, -1, 2, 18, 2],
      pos: [Math.cos(a) * 5, 15, Math.sin(a) * 5],
      rot: [0, (a * 180) / Math.PI + 90, 0],
    });
  }
  return parts;
}

/* ---- Cod ----------------------------------------------------------------
   Body and head are read straight off the texture's own unwrap. The tail is a
   zero-width box, which is how the game draws a flat fin: the two side faces
   land on top of each other and the four edge faces have no area. */
const COD = [
  { name: 'body', uv: [0, 0],   box: [-1, -2, 0, 2, 4, 7],  pos: [0, 22, 0] },
  { name: 'head', uv: [11, 0],  box: [-1, -2, -3, 2, 4, 3], pos: [0, 22, 0] },
  { name: 'tail', uv: [20, 10], box: [0, -2, 0, 0, 4, 4],   pos: [0, 22, 7] },
];

/* Salmon and dolphin are deliberately absent. Their textures are here in the
   pack, but their part layouts are Java, not data, and a guessed dolphin looks
   like a guessed dolphin. Add them the moment there is a model to copy. */
export const MODELS = {
  squid:  { spec: squidSpec(), atlas: [64, 32], texture: 'squid.png',      px: 3.4, swim: 'squid' },
  glow:   { spec: squidSpec(), atlas: [64, 32], texture: 'glow_squid.png', px: 3.2, swim: 'squid' },
  fry:    { spec: squidSpec(), atlas: [64, 32], texture: 'squid_baby.png', px: 1.8, swim: 'squid' },
  cod:    { spec: COD,         atlas: [32, 32], texture: 'cod.png',        px: 6.0, swim: 'fish'  },
};

/* Deterministic noise, so the scene is arranged rather than merely random and
   two reloads do not put every fish in the same place. */
function shuffled(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* One drifting mob: a wrapper that carries it across the screen, and inside it
   the model, turned to swim the way it is travelling. */
function spawn(kind, rnd, base) {
  const k = MODELS[kind];
  if (!k) return null;

  const lane = document.createElement('div');
  lane.className = 'swimmer';
  lane.dataset.kind = kind;

  const depth = 0.55 + rnd() * 0.75;              // near mobs are bigger and faster
  const dir = rnd() < 0.5 ? 1 : -1;                // 1 travels right, -1 left
  const secs = (46 - depth * 16) + rnd() * 20;

  lane.style.setProperty('--top', `${6 + rnd() * 78}%`);
  lane.style.setProperty('--scale', depth.toFixed(3));
  lane.style.setProperty('--from', dir > 0 ? '-18vw' : '118vw');
  lane.style.setProperty('--to',   dir > 0 ? '118vw' : '-18vw');
  lane.style.setProperty('--dur', `${secs.toFixed(1)}s`);
  lane.style.setProperty('--delay', `${(-rnd() * secs).toFixed(1)}s`);
  lane.style.setProperty('--bob', `${(8 + rnd() * 18).toFixed(0)}px`);
  lane.style.opacity = (0.42 + depth * 0.34).toFixed(2);

  /* A fish model is built nose-first along -Z, so turning it a quarter turn
     puts it side-on and swimming the way the lane runs. A squid has no nose to
     speak of; it just faces the room. */
  const face = k.swim === 'fish' ? (dir > 0 ? -72 : 72) : (dir > 0 ? -22 : 22);
  lane.style.setProperty('--face', face);

  const model = buildModel(k.spec, { atlas: k.atlas, px: k.px, prefix: kind });
  model.classList.add('mob', `mob-${k.swim}`);
  // Absolute: a relative url() in a custom property resolves against the
  // stylesheet that substitutes it, not against the document.
  model.style.setProperty('--mob-url',
    `url("${new URL(base + k.texture, document.baseURI).href}")`);
  lane.appendChild(model);
  return lane;
}

export function sealife(host, base = 'assets/') {
  // Squid first — this is a squid's website — then enough fish to feel alive
  // without turning the background into an aquarium shop.
  const cast = ['squid', 'cod', 'glow', 'cod', 'fry', 'squid', 'cod', 'fry', 'glow'];
  const rnd = shuffled(Date.now() & 0xffff);
  const frag = document.createDocumentFragment();
  for (const kind of cast) {
    const el = spawn(kind, rnd, base);
    if (el) frag.appendChild(el);
  }
  host.appendChild(frag);
}
