import { buildSkin, animateSkin } from './skin.js';
import { water } from './water.js';
import { sealife } from './mobs.js';

/* Two themes, the same pair the studio uses. There is no toggle on this page,
   so it follows the system. */
document.documentElement.dataset.theme =
  matchMedia('(prefers-color-scheme: light)').matches ? 'bone' : 'deepslate';

const sea = document.getElementById('sea');
if (sea) water(sea, 'assets/water.png');

const life = document.getElementById('life');
if (life) sealife(life, 'assets/');

/* Built after the skin has decoded so the model never flashes as a stack of
   untextured rectangles. If it will not load, the stage stays empty. */
const stage = document.getElementById('skin-stage');
if (stage) {
  const img = new Image();
  img.onload = () => {
    // The MineCon 2015 cape is in assets/ and the renderer knows how to draw
    // it, but from the front it is a sliver of red behind one arm and reads as
    // a glitch rather than a flex. Add `cape: 'assets/cape.png'` to turn it on.
    const rig = buildSkin(stage, {
      skin: 'assets/skin.png',
      plinth: 'assets/plinth.png',
    });
    animateSkin(stage, rig);
  };
  img.src = 'assets/skin.png';
}
