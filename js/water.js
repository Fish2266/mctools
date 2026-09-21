/* ============================================================================
   WATER
   water_still.png is the game's own texture: a 16x512 strip of 32 frames, held
   two ticks each (its .mcmeta says frametime 2) and tinted by biome. CSS cannot
   tile one frame out of a strip, so each frame is baked into its own tinted
   tile once, turned into a repeating pattern, and the canvas is filled with the
   pattern of the moment.
   ========================================================================= */

const TILE = 16;          // one frame, in texture pixels
const FRAMES = 32;
const SCALE = 3;          // texture pixels to css pixels
const MS = 100;           // frametime 2 ticks
const TINT = '#3A6FD8';   // overworld water

export function water(canvas, src) {
  const ctx = canvas.getContext('2d');
  const img = new Image();
  let patterns = [];
  let frame = 0;
  let dpr = 1;
  let timer = 0;
  let resizing = false;

  const currentDpr = () => Math.min(devicePixelRatio || 1, 2);

  function bake() {
    dpr = currentDpr();
    const side = TILE * SCALE * dpr;
    patterns = [];
    for (let f = 0; f < FRAMES; f++) {
      const t = document.createElement('canvas');
      t.width = t.height = side;
      const c = t.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.drawImage(img, 0, f * TILE, TILE, TILE, 0, 0, side, side);
      // The texture ships greyscale; the game tints it per biome.
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = TINT;
      c.fillRect(0, 0, side, side);
      patterns.push(ctx.createPattern(t, 'repeat'));
    }
  }

  function size() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    paint();
  }

  function paint() {
    if (!patterns.length) return;
    ctx.fillStyle = patterns[frame];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  img.onload = () => {
    bake();
    size();
    /* Resize fires dozens of times a second during a drag. The tiles only
       depend on the pixel ratio, so they are rebaked only when that changes
       (a move to another screen) and the canvas is resized once a frame. */
    const onResize = () => {
      if (resizing) return;
      resizing = true;
      requestAnimationFrame(() => {
        resizing = false;
        if (currentDpr() !== dpr) bake();
        size();
      });
    };
    addEventListener('resize', onResize, { passive: true });
    /* The canvas is inside a `position: fixed; inset: 0` layer, so its box
       grows when iOS slides its toolbars away — and iOS does that without
       firing `resize` on the window. Without this the water stays painted at
       the old height and leaves a bare band along the bottom. */
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onResize, { passive: true });
    }
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      timer = setInterval(() => { frame = (frame + 1) % FRAMES; paint(); }, MS);
    }
    // A hidden tab does not need ten frames a second of nothing.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearInterval(timer); timer = 0; }
      else if (!timer && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timer = setInterval(() => { frame = (frame + 1) % FRAMES; paint(); }, MS);
      }
    });
  };
  img.onerror = () => canvas.remove();
  img.src = src;
}
