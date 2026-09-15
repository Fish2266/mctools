# Fish's MC Tools

The landing page for three browser tools for Minecraft, at
**<https://fish2266.github.io/mctools>**.

It deploys as a project site rather than the user site, so
`fish2266.github.io` itself stays free for whatever goes there. Nothing in
the page assumes it is served from the root — every path is relative and the
scripts resolve theirs against `document.baseURI` — so it would work at the
root too if that ever changes.

One screen: the name, the character, and the three tools.

| Tool | State | What it is |
| --- | --- | --- |
| [Frame & Groove](https://fish2266.github.io/frame-and-groove/) | Live | Paintings, music discs, mob variants and item textures → data pack + resource pack |
| [Skin Slicer](https://fish2266.github.io/skinslicer/) | Live | A base skin, items worn over it and tinted colour by colour, outfits you can swap → a skin PNG |
| [All The Sounds](https://fish2266.github.io/all-the-sounds/) | Live | Record a replacement for every sound in the game → resource pack |

Static HTML, CSS and ES modules. No build step, no dependencies, nothing to
install. Open `index.html` over any local server and it runs.

## Layout

```
index.html          the whole page
css/tokens.css      copied from Frame & Groove — the shared design language
css/base.css        copied from Frame & Groove
css/components.css  copied from Frame & Groove
css/landing.css     only this page's own layer
js/model.js         turns Minecraft box models into DOM
js/skin.js          the player model
js/mobs.js          the sea life
js/water.js         the animated water
js/main.js          wiring
assets/             textures
```

`tokens.css`, `base.css` and `components.css` are byte-for-byte copies from
Frame & Groove so the two sites stay in step. When that project's design
language changes, copy them across again rather than editing them here.

## The 3D models

Nothing renders to WebGL. `js/model.js` takes a Minecraft part list — the same
`texOffs(u, v).addBox(x, y, z, w, h, d)` the game itself uses — and builds each
cuboid out of six CSS-3D-transformed divs, each showing one rectangle of the
texture at `image-rendering: pixelated`. So the pixels on screen are the pixels
in the PNG, and the models are data rather than code.

Present: the player, the squid (regular, glow and baby) and the cod. **Salmon
and dolphin are deliberately missing.** Their textures are in the asset pack,
but their part layouts live in Java rather than in any data file, and a guessed
dolphin looks like a guessed dolphin. Drop a part list into `js/mobs.js` — from
Blockbench, or from the game's model classes — and they will render alongside
the rest with no other changes.

## Assets

| File | Source |
| --- | --- |
| `skin.png` | The `NoFish` account's current skin, from the Mojang session server |
| `cape.png` | The same account's MineCon 2015 cape |
| `water.png` | `block/water_still.png` — 32 frames, played at the frametime its own `.mcmeta` gives (2 ticks) |
| `dark_prismarine.png`, `plinth.png` | `block/dark_prismarine.png` |
| `squid.png`, `glow_squid.png`, `squid_baby.png`, `cod.png` | `entity/…` |

The skin is a copy on purpose. Crafatar and mc-heads both served a stale one,
and the live services would be a runtime dependency for a static page. To
refresh it after changing skins:

```bash
UUID=37826c90aec2453bb17d10f403f74d80
curl -s "https://sessionserver.mojang.com/session/minecraft/profile/$UUID" \
  | python3 -c "import sys,json,base64;print(json.loads(base64.b64decode(json.load(sys.stdin)['properties'][0]['value']))['textures']['SKIN']['url'])" \
  | xargs curl -sL -o assets/skin.png
```

The cape is downloaded but not drawn: from the front it is a sliver of red
behind one arm and reads as a glitch rather than a flex. Pass
`cape: 'assets/cape.png'` in `js/main.js` to turn it on.

## Running it

```bash
python3 .devserver.py
```

Then <http://127.0.0.1:4173>. It has to be a server, not `file://` — the page
uses ES modules.

## Deploying

Pushing to `main` on `Fish2266/mctools` publishes to
<https://fish2266.github.io/mctools>, with Pages set to deploy from the
`main` branch, root. `.nojekyll` is there so Pages serves the files as they
are rather than running them through Jekyll.

The working copy is still in a folder called `Fish2266.github.io`, which is a
leftover from when this was going to be the user site. Only the repository
name decides the URL, so the folder name costs nothing but is worth renaming
if it ever confuses.

---

Not an official Minecraft product. Not approved by or associated with Mojang.
Textures are Mojang's and are used here for a fan tool.
