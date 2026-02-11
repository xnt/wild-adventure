# Agent guide — Wild Adventure

This file helps AI assistants (and humans) understand the project and make consistent changes.

## Stack & entry points

- **Runtime**: Phaser 3 (arcade physics), no game framework beyond that.
- **Build**: Vite. ES modules throughout; no CommonJS.
- **Entry**: `index.html` → `/src/main.js` → `new Phaser.Game(config)` with a single scene, `GameScene`.

**Run**: `npm install` then `npm run dev` (dev server) or `npm run build` + `npm run preview` (production).

## Code layout

| Path | Role |
|------|------|
| `src/main.js` | Phaser config only (canvas size, scale, physics, scene list). Add new scenes here. |
| `src/constants.js` | All tunable numbers (speeds, HP, ranges, cooldowns) and the player spritesheet frame map (`FRAMES`). Change gameplay balance or sprite layout here. |
| `src/map.js` | Procedural 50×50 tilemap. Exports `generateMap()` and `mapData`. Tile types: 0 grass, 1 tree, 2 rock. |
| `src/fallbacks.js` | Programmatic texture generation when PNGs are missing. Exports `generateFallbacks(scene)`. Add new fallbacks here if you add new asset keys. |
| `src/scenes/GameScene.js` | The only scene: preload, create, update, and all game logic (player, enemies, combat, UI, touch). Large file; use `_methodName` for private-style helpers. |
| `public/` | Static assets. Vite serves these at `/`. Game loads e.g. `grass.png` from root, so files go in `public/` (e.g. `public/grass.png`). |

There is no state management beyond Phaser scenes; no Redux, no global store. Scene state is reset in `GameScene.init()` on restart.

## Conventions

- **Imports**: Use explicit `.js` in relative imports (e.g. `from './constants.js'`). No TypeScript.
- **New scenes**: Create under `src/scenes/`, add to the `scene: [...]` array in `main.js`.
- **New assets**: Load in the scene’s `preload()`. If the asset is optional, ensure a fallback exists in `fallbacks.js` (keyed by the same string). List new PNGs in `README.md`.
- **Gameplay constants**: Prefer adding and tweaking values in `constants.js` rather than magic numbers in the scene.
- **Style**: Existing code uses trailing commas, single quotes, and short comments where helpful. Match that style in new code.

## Phaser-specific

- **Physics**: Arcade only. No matter, no complex bodies. Use `this.physics.add.collider`, `overlap`, and velocity/position.
- **Camera**: Main camera follows the player with `startFollow(player, true, 0.15, 0.15)`. Bounds are set from map dimensions in `constants.js` (e.g. `MAP_COLS * TILE_SIZE`).
- **Animations**: Created once in `GameScene._createPlayer()`; guarded with `if (!this.anims.exists('idle_up'))` so restarts don’t duplicate. Animation keys follow `idle_*`, `walk_*`, `attack_*` with direction suffix (`up`, `down`, `left`, `right`).
- **Spritesheet**: Player is a 512×512 sheet, 32×32 frames, 16 columns. Frame indices are in `constants.js` as `FRAMES`; the fallback in `fallbacks.js` draws a canvas in the same layout.

## Testing changes

- After editing: run `npm run dev` and reload the browser. For production build, run `npm run build` and optionally `npm run preview`.
- No automated tests or CI are set up; manual play-test is the primary check.

## README

User-facing docs (controls, setup, assets, gameplay) live in `README.md`. Keep `AGENTS.md` focused on implementation and where to change things.
