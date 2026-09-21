/* ============================================================================
   BACKGROUND SEA LIFE
   Vanilla box models for the mobs that belong in water, drifting across the
   page behind the content. Part lists follow the game's own definitions:
   texOffs(u, v).addBox(x, y, z, w, h, d) at PartPose.offset(x, y, z).
   ========================================================================= */

import { buildModel } from './model.js';

const TAU = Math.PI * 2;

/* ---- Squid --------------------------------------------------------------
   One fat body and eight tentacles on a ring, each turned to face outward —
   the model the game builds. A baby squid is not the adult scaled down: it
   ships its own 32x32 texture with its own smaller boxes, and its tentacles
   are kept somewhere else in the sheet entirely. Both layouts were read off
   the textures' alpha channels:

     adult  64x32  body 12x16x12 at (0,0), tentacle 2x18x2 at (48,0)
     baby   32x32  body  8x10x8  at (0,0), tentacle 2x6x2  at (0,18)

   Handing the adult's layout to the baby is what tore its texture apart. */
function squidSpec({ bw, bh, tw, th, ring, tentUv, hang }) {
  const parts = [
    { name: 'body', uv: [0, 0], pos: [0, bh / 2, 0],
      box: [-bw / 2, -bh / 2, -bw / 2, bw, bh, bw] },
  ];
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8;
    parts.push({
      name: `t${i}`,
      uv: tentUv,
      box: [-tw / 2, 0, -tw / 2, tw, th, tw],
      pos: [Math.cos(a) * ring, hang, Math.sin(a) * ring],
      rot: [0, (a * 180) / Math.PI + 90, 0],
    });
  }
  return parts;
}

const SQUID = squidSpec({ bw: 12, bh: 16, tw: 2, th: 18, ring: 5,   tentUv: [48, 0], hang: 15 });
const FRY   = squidSpec({ bw: 8,  bh: 10, tw: 2, th: 6,  ring: 3.4, tentUv: [0, 18], hang: 9 });

/* ---- Cod ----------------------------------------------------------------
   Read off cod.png's alpha channel rather than remembered. Every painted
   region is some part's unwrap landing on it:

     body    texOffs(0,0)  2x4x7  -> x7-11 y0-7, plus the band x0-18 y7-11
     head    texOffs(11,0) 2x4x3  -> x14-18 y0-3, plus the band x11-21 y3-7
     tail    texOffs(22,3) 0x4x4  -> the painted half of the pair, x26-30 y7-11
     fins    texOffs(24,0) and (24,4), 2x0x2 -> the 2x2s at x26-28
     dorsal  a 6x4 patch at x0-6 y0-4, in the corner the body's own unwrap
             leaves empty. Only a zero-depth plane at texOffs(0,0) reaches it,
             so it is named outright rather than guessed at.

   The tail patch is the forked one — a narrow stalk with a prong above and
   below, which is the Y the fish actually has:

       ..##      and it is drawn tip-first, so the part is mirrored to hang
       ###.      the stalk on the body rather than the fork.
       ###.
       ..##

   The dorsal reads as a solid slab shading from dark to pale because nearly
   all of it is inside the fish. Sitting at y21 against a body spanning y20-24,
   only its top row clears the back — and that row is `.####.`, so what shows
   is a ridge one high and four long with a gap at either end. Mistaking that
   slab for the tail is what made the cod a featureless bar.

   A fin is a box with one dimension zero, which is how the game draws flat
   parts; model.js turns each into a single double-sided quad. */
const COD = [
  { name: 'body',   uv: [0, 0],  box: [-1, -2, 0, 2, 4, 7],  pos: [0, 22, 0] },
  { name: 'head',   uv: [11, 0], box: [-1, -2, -3, 2, 4, 3], pos: [0, 22, 0] },
  { name: 'dorsal', box: [0, -2, 0, 0, 4, 6], pos: [0, 21, 0],
    faces: { left: [0, 0, 6, 4] } },
  { name: 'tail',   uv: [22, 3], box: [0, -2, 0, 0, 4, 4], pos: [0, 22, 7], mirror: true },
  { name: 'finR',   uv: [24, 0], box: [-2, 0, 0, 2, 0, 2], pos: [-1, 23, 1], rot: [0, 0, -35] },
  { name: 'finL',   uv: [24, 4], box: [0, 0, 0, 2, 0, 2],  pos: [1, 23, 1],  rot: [0, 0, 35] },
];

/* Salmon and dolphin are deliberately absent. Their textures are here in the
   pack, but their part layouts are Java, not data, and a guessed dolphin looks
   like a guessed dolphin. Add them the moment there is a model to copy. */
export const MODELS = {
  squid:  { spec: SQUID, atlas: [64, 32], texture: 'squid.png',      px: 3.4, swim: 'squid' },
  glow:   { spec: SQUID, atlas: [64, 32], texture: 'glow_squid.png', px: 3.2, swim: 'squid' },
  fry:    { spec: FRY,   atlas: [32, 32], texture: 'squid_baby.png', px: 3.6, swim: 'squid' },
  cod:    { spec: COD,         atlas: [32, 32], texture: 'cod.png',        px: 6.0, swim: 'fish'  },
};

/* Seeded noise: one seed per page load, so a single load is arranged from one
   consistent stream, and two reloads do not put every fish in the same place. */
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
  lane.style.setProperty('--bob', `${(6 + rnd() * 14).toFixed(0)}px`);
  lane.style.opacity = (0.42 + depth * 0.34).toFixed(2);

  /* How the model is turned to face its heading.
     A fish is built nose-first along -Z, so a quarter turn about Y puts it
     side-on and swimming the way the lane runs; a little less than a quarter
     leaves it slightly three-quarter so it reads as solid.
     A squid is built upright, mantle at -Y and tentacles hanging at +Y, and it
     swims mantle-first with the tentacles trailing — so it lies down, a quarter
     turn about Z, which leaves its eyes still facing the room. The yaw on top
     of that angles its length into the screen, so the ring of eight tentacles
     is seen open rather than edge-on as a single bar. */
  const squid = k.swim === 'squid';
  lane.style.setProperty('--rx', squid ? -10 : -6);
  lane.style.setProperty('--ry', squid ? (dir > 0 ? 32 : -32) : (dir > 0 ? -72 : 72));
  lane.style.setProperty('--rz', squid ? (dir > 0 ? 90 : -90) : 0);

  /* The pulse. A squid holds still, fans its tentacles wide, then snaps them
     shut — and it is the snap that moves it.

     --surge is the full swing of that gap. Integrating the game's velocity
     profile over one pulse — a quarter of average speed while it fans, near
     three times average on the snap, then a 0.9-per-tick decay — gives a swing
     of 0.396 times the ground the lane itself covers in a pulse. Measuring it
     in vw, the lane's own unit, keeps that true at any window width: the lane
     crosses 136vw in `secs`. */
  if (squid) {
    const pulse = 2.5 + rnd() * 1.4;
    const surge = 0.396 * 136 * pulse / secs;
    lane.style.setProperty('--pulse', `${pulse.toFixed(2)}s`);
    lane.style.setProperty('--surge', `${(dir * surge).toFixed(2)}vw`);
    lane.style.setProperty('--pulse-delay', `${(-rnd() * pulse).toFixed(2)}s`);
  }

  const model = buildModel(k.spec, { atlas: k.atlas, px: k.px, prefix: kind });
  model.classList.add('mob', `mob-${k.swim}`);
  // Absolute: a relative url() in a custom property resolves against the
  // stylesheet that substitutes it, not against the document.
  model.style.setProperty('--mob-url',
    `url("${new URL(base + k.texture, document.baseURI).href}")`);
  // The surge rides on its own wrapper so it can add to the lane's steady
  // travel instead of fighting it for the transform property.
  const lurch = document.createElement('div');
  lurch.className = 'lurch';
  lurch.appendChild(model);
  lane.appendChild(lurch);
  return lane;
}

export function sealife(host, base = 'assets/') {
  /* Who is in the water. Cod are finished and correct — forked tail, the low
     dorsal ridge, pectoral fins — but they are benched for now. Take 'cod'
     out of BENCHED to swim them again; nothing else has to change. */
  const BENCHED = new Set(['cod']);

  /* Every swimmer is a few dozen 3D-transformed faces carrying their own
     animation. Nine of them is around 490 composited quads, and a phone shows
     a narrow slice of that water at a time — so it pays the whole cost and
     sees almost none of it. Narrow screens get a shorter cast that still has
     one of each kind in it. */
  const FULL = ['squid', 'cod', 'glow', 'cod', 'fry', 'squid', 'cod', 'fry', 'glow'];
  const SHORT = ['squid', 'glow', 'fry'];
  const CAST = matchMedia('(max-width: 620px)').matches ? SHORT : FULL;
  // A benched kind hands its slot to a stand-in rather than leaving a hole, so
  // the water stays as busy as the cast asks for.
  const SUBS = ['glow', 'squid', 'fry'];
  let sub = 0;
  const cast = CAST.map(k => (BENCHED.has(k) ? SUBS[sub++ % SUBS.length] : k));

  const rnd = shuffled(Date.now() & 0xffff);
  const frag = document.createDocumentFragment();
  for (const kind of cast) {
    const el = spawn(kind, rnd, base);
    if (el) frag.appendChild(el);
  }
  host.appendChild(frag);
}
