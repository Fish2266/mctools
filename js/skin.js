/* ============================================================================
   SKIN VIEWER
   The vanilla player model, built out of CSS 3D transforms so the pixels stay
   the pixels the skin author drew — no resampling, no WebGL, no library.
   ========================================================================= */

import { cuboid, FACES } from './model.js';

/* Every part of the player model.
   uv     — top-left of the part's block in the atlas
   dim    — [width, height, depth] in skin pixels
   pivot  — where the part hinges, in model space (origin at the neck)
   offset — the box centre relative to that pivot
   over   — atlas origin of the second (hat / jacket / sleeve) layer */
const PARTS = [
  { group: 'head', uv: [0, 0],   dim: [8, 8, 8],  pivot: [0, 0, 0],   offset: [0, -4, 0], over: [32, 0] },
  { group: 'body', uv: [16, 16], dim: [8, 12, 4], pivot: [0, 0, 0],   offset: [0, 6, 0],  over: [16, 32] },
  { group: 'armR', uv: [40, 16], dim: [4, 12, 4], pivot: [-4, 2, 0],  offset: [-2, 4, 0], over: [40, 32] },
  { group: 'armL', uv: [32, 48], dim: [4, 12, 4], pivot: [4, 2, 0],   offset: [2, 4, 0],  over: [48, 48] },
  { group: 'legR', uv: [0, 16],  dim: [4, 12, 4], pivot: [-2, 12, 0], offset: [0, 6, 0],  over: [0, 32] },
  { group: 'legL', uv: [16, 48], dim: [4, 12, 4], pivot: [2, 12, 0],  offset: [0, 6, 0],  over: [0, 48] },
];

/* The cape lives in its own 64x32 atlas and is unwrapped differently enough
   that it is easier to spell the six faces out than to reuse the helper. */
const CAPE = {
  dim: [10, 16, 1],
  atlas: [64, 32],
  faces: {
    top:    [1, 0, 10, 1],
    bottom: [11, 0, 10, 1],
    right:  [11, 1, 1, 16],
    front:  [12, 1, 10, 16],   // the side against the player's back
    left:   [0, 1, 1, 16],
    back:   [1, 1, 10, 16],    // the side the world sees
  },
};

const PX = 6;

/* A single Minecraft block for the model to stand on, built from one 16x16
   texture in the same 3D scene so it turns with the diorama. */
function block(texture, size, topY) {
  const faces = {};
  for (const f of FACES) faces[f.key] = [0, 0, 16, 16];
  const el = cuboid(null, [size, size, size], [0, topY + size / 2, 0],
    { atlas: [16, 16], explicit: faces, px: PX });
  el.classList.add('mc-block');
  el.style.setProperty('--block-url', `url("${texture}")`);
  return el;
}

export function buildSkin(host, { skin = 'assets/skin.png', cape = null, plinth = null } = {}) {
  // Absolute, because a relative url() inside a custom property is resolved
  // against the stylesheet that substitutes it, not against the document.
  const abs = src => new URL(src, document.baseURI).href;
  host.style.setProperty('--skin-url', `url("${abs(skin)}")`);
  if (cape) host.style.setProperty('--cape-url', `url("${abs(cape)}")`);

  const rig = document.createElement('div');
  rig.className = 'mc-rig';

  const char = document.createElement('div');
  char.className = 'mc-char';
  rig.appendChild(char);

  const groups = {};
  for (const p of PARTS) {
    const g = document.createElement('div');
    g.className = `mc-group mc-${p.group}`;
    g.style.transform =
      `translate3d(${p.pivot[0] * PX}px, ${p.pivot[1] * PX}px, ${p.pivot[2] * PX}px)`;
    groups[p.group] = g;

    g.appendChild(cuboid(p.uv, p.dim, p.offset, { px: PX }));

    if (p.over) {
      const [w, h, d] = p.dim;
      const wrap = document.createElement('div');
      wrap.className = 'mc-overlay';
      // Push the second layer half a pixel proud of the first on every side,
      // which is exactly what the game does.
      wrap.style.transform =
        `translate3d(${p.offset[0] * PX}px, ${p.offset[1] * PX}px, ${p.offset[2] * PX}px)` +
        ` scale3d(${(w + 1) / w}, ${(h + 1) / h}, ${(d + 1) / d})`;
      wrap.appendChild(cuboid(p.over, p.dim, [0, 0, 0], { px: PX }));
      g.appendChild(wrap);
    }

    char.appendChild(g);
  }

  // The head goes first in the DOM so its hat layer composites over the body.
  char.insertBefore(groups.head, char.firstChild);

  if (cape) {
    const g = document.createElement('div');
    g.className = 'mc-group mc-cape';
    g.style.transform = `translate3d(0px, ${1 * PX}px, ${-2 * PX}px)`;
    g.appendChild(cuboid(null, CAPE.dim, [0, 8, -0.5],
      { atlas: CAPE.atlas, explicit: CAPE.faces, px: PX }));
    char.appendChild(g);
  }

  if (plinth) {
    // Its top face lands exactly where the feet do.
    rig.appendChild(block(abs(plinth), 16, 24));
  }

  host.appendChild(rig);
  return rig;
}

/* ---- Pointer-driven idle ---------------------------------------------------
   The model turns to follow the cursor across the page, easing toward the
   target rather than snapping, and the head leads the body slightly the way a
   real look-at does. Anyone who asked for reduced motion gets a still pose. */
export function animateSkin(host, rig) {
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const head = rig.querySelector('.mc-head');
  const state = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 };
  let raf = 0;

  function target(ev) {
    const r = host.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    state.tYaw = clamp((ev.clientX - cx) / (innerWidth / 2), -1, 1) * 34;
    state.tPitch = clamp((ev.clientY - cy) / (innerHeight / 2), -1, 1) * 16;
  }

  function tick() {
    state.yaw += (state.tYaw - state.yaw) * 0.07;
    state.pitch += (state.tPitch - state.pitch) * 0.07;
    rig.style.setProperty('--yaw', `${state.yaw * 0.62}deg`);
    rig.style.setProperty('--pitch', `${state.pitch * 0.35}deg`);
    if (head) {
      head.style.setProperty('--head-yaw', `${state.yaw * 0.38}deg`);
      head.style.setProperty('--head-pitch', `${state.pitch * 0.65}deg`);
    }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (still.matches) { stop(); return; }
    addEventListener('pointermove', target, { passive: true });
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function stop() {
    removeEventListener('pointermove', target);
    cancelAnimationFrame(raf); raf = 0;
    rig.style.setProperty('--yaw', '0deg');
    rig.style.setProperty('--pitch', '0deg');
  }

  still.addEventListener('change', start);
  start();
}

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
