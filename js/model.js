/* ============================================================================
   BOX MODELS
   Minecraft builds every entity out of textured cuboids, and unwraps each one
   the same way: a cross laid out from the box's top-left corner in the atlas.
   This module does that one job — turn `texOffs(u, v).addBox(x, y, z, w, h, d)`
   into DOM — so the player skin and the mobs share a renderer.

   Coordinates match the game's own model space: x right, y DOWN, z toward the
   viewer, measured in texture pixels.
   ========================================================================= */

export const PX = 6;   // css pixels per model pixel, at scale 1

/* The six faces, in the order the unwrap lays them out. `at` is where the face
   sits in the atlas relative to the box's uv origin; `size` is how big that
   patch is; `xf` places the face on the box. */
export const FACES = [
  { key: 'top',    at: (w, h, d) => [d,         0],  size: (w, h, d) => [w, d],
    xf: (w, h, d) => `translateY(${-h / 2}px) rotateX(90deg)` },
  { key: 'bottom', at: (w, h, d) => [d + w,     0],  size: (w, h, d) => [w, d],
    xf: (w, h, d) => `translateY(${h / 2}px) rotateX(-90deg)` },
  { key: 'right',  at: (w, h, d) => [0,         d],  size: (w, h, d) => [d, h],
    xf: (w, h, d) => `translateX(${-w / 2}px) rotateY(-90deg)` },
  { key: 'front',  at: (w, h, d) => [d,         d],  size: (w, h, d) => [w, h],
    xf: (w, h, d) => `translateZ(${d / 2}px)` },
  { key: 'left',   at: (w, h, d) => [d + w,     d],  size: (w, h, d) => [d, h],
    xf: (w, h, d) => `translateX(${w / 2}px) rotateY(90deg)` },
  { key: 'back',   at: (w, h, d) => [d + w + d, d],  size: (w, h, d) => [w, h],
    xf: (w, h, d) => `translateZ(${-d / 2}px) rotateY(180deg)` },
];

/* One textured quad. `uvSize` is how big the patch is in the texture; `size` is
   how big it is on screen. Keeping the two separate is what lets a 16x16 block
   texture stretch across a 22-unit cube while a skin stays pixel-for-pixel. */
function face({ box, atlas, uv, uvSize, size, side, flat }) {
  const el = document.createElement('i');
  el.className = 'mc-face';
  el.dataset.side = side;          // CSS shades top/side/bottom like the game
  // A flat part has no inside to hide, and has to be visible from both sides.
  if (flat) el.style.backfaceVisibility = 'visible';
  const [fw, fh] = size;
  const [uw, uh] = uvSize;
  const sx = uw ? fw / uw : 1;
  const sy = uh ? fh / uh : 1;
  el.style.width = `${fw}px`;
  el.style.height = `${fh}px`;
  el.style.backgroundSize = `${atlas[0] * sx}px ${atlas[1] * sy}px`;
  el.style.backgroundPosition = `${-uv[0] * sx}px ${-uv[1] * sy}px`;
  el.style.marginLeft = `${-fw / 2}px`;
  el.style.marginTop = `${-fh / 2}px`;
  el.style.transform = box;
  return el;
}

/* One cuboid: a zero-size anchor at the box centre with six faces hung off it.
   `explicit` overrides the standard unwrap with per-face [u, v, w, h] patches,
   which is how a block gets the same 16x16 texture on all six sides. */
export function cuboid(uvOrigin, dim, offset, {
  atlas = [64, 64], explicit = null, px = PX, cls = '',
} = {}) {
  const [w, h, d] = dim;
  const el = document.createElement('div');
  el.className = `mc-box ${cls}`.trim();
  el.style.transform =
    `translate3d(${offset[0] * px}px, ${offset[1] * px}px, ${offset[2] * px}px)`;

  /* A fin is a box with one dimension set to zero — that is how the game draws
     flat parts. Four of its six faces then have no area at all, and the two
     that remain sit on top of each other, one of them usually blank. Drawing
     all six would leave the blank one facing the viewer and the fin would
     vanish, so a flat part becomes exactly one double-sided quad. */
  const flat = w === 0 || h === 0 || d === 0;
  const only = w === 0 ? 'left' : h === 0 ? 'top' : d === 0 ? 'front' : null;

  for (const f of FACES) {
    if (flat && f.key !== only) continue;
    const [fw, fh] = f.size(w, h, d);
    let uv, uvSize;
    if (explicit) {
      const [x, y, uw, uh] = explicit[f.key];
      uv = [x, y];
      uvSize = [uw, uh];
    } else {
      const [ax, ay] = f.at(w, h, d);
      uv = [uvOrigin[0] + ax, uvOrigin[1] + ay];
      uvSize = [fw, fh];
    }
    el.appendChild(face({
      box: f.xf(w * px, h * px, d * px),
      atlas, uv, uvSize, size: [fw * px, fh * px], side: f.key, flat,
    }));
  }
  return el;
}

/* How far a part list reaches in each axis, so a model can be hung on its own
   centre instead of on whatever corner the game happened to measure from. */
function bounds(spec) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const part of spec) {
    const [bx, by, bz, w, h, d] = part.box;
    const [px_, py, pz] = part.pos || [0, 0, 0];
    const min = [px_ + bx, py + by, pz + bz];
    const max = [min[0] + w, min[1] + h, min[2] + d];
    for (let i = 0; i < 3; i++) {
      if (min[i] < lo[i]) lo[i] = min[i];
      if (max[i] > hi[i]) hi[i] = max[i];
    }
  }
  return lo.map((v, i) => (v + hi[i]) / 2);
}

/* Build a whole model from a part list written the way the game writes them:
     { name, uv: [u, v], box: [x, y, z, w, h, d], pos: [x, y, z], rot: [x,y,z] }
   `faces` may override `uv` with explicit per-face [u, v, w, h] patches.
   `box` is addBox — a corner and a size. `pos` is the part's pivot, `rot` its
   resting rotation in degrees. Each part becomes a pivot div (which animation
   can rotate freely) holding one cuboid. */
export function buildModel(spec, { atlas, px = PX, prefix = 'p', centre = true } = {}) {
  const root = document.createElement('div');
  root.className = 'mc-model';

  // The game measures a mob from the ground under its feet, so a cod's parts
  // all sit twenty-two units below the origin. Left alone the model would hang
  // that far below wherever it is placed; centring makes the anchor the mob.
  const c = centre ? bounds(spec) : [0, 0, 0];

  for (const part of spec) {
    const [bx, by, bz, w, h, d] = part.box;
    const [px_, py, pz] = part.pos || [0, 0, 0];
    const [rx, ry, rz] = part.rot || [0, 0, 0];

    const pivot = document.createElement('div');
    pivot.className = `mc-group ${prefix}-${part.name}`;
    pivot.style.transform =
      `translate3d(${(px_ - c[0]) * px}px, ${(py - c[1]) * px}px, ${(pz - c[2]) * px}px)` +
      (rz ? ` rotateZ(${rz}deg)` : '') +
      (ry ? ` rotateY(${ry}deg)` : '') +
      (rx ? ` rotateX(${rx}deg)` : '');
    // Remember the resting pose so a keyframe can add to it instead of
    // replacing it and snapping the part back to the origin.
    pivot.style.setProperty('--rest', pivot.style.transform);

    // addBox gives a corner; the renderer wants the middle of the box.
    const mid = [bx + w / 2, by + h / 2, bz + d / 2];
    pivot.appendChild(cuboid(part.uv, [w, h, d], mid,
      { atlas, px, explicit: part.faces || null }));
    root.appendChild(pivot);
  }
  return root;
}
