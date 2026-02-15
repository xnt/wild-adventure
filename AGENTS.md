# Agent guide — Wild Adventure

This file helps AI assistants (and humans) understand the project and make consistent changes.

## Stack & entry points

- **Runtime**: Phaser 4 RC (arcade physics), no game framework beyond that. (See PHASER4_MIGRATION.md for details.)
- **Build**: Vite. ES modules throughout; no CommonJS.
- **Entry**: `index.html` → `/src/main.ts` → `new Phaser.Game(config)` with a single scene, `GameScene`.

**Run**: `npm install` then `npm run dev` (dev server) or `npm run build` + `npm run preview` (production).

## Code layout

| Path | Role |
|------|------|
| `src/main.ts` | Phaser config only (canvas size, scale, physics, scene list). Add new scenes here. |
| `src/constants.ts` | All tunable numbers (speeds, HP, ranges, cooldowns) and the player spritesheet frame map (`FRAMES`). Change gameplay balance or sprite layout here. |
| `src/map.ts` | Procedural 50×50 tilemap. Exports `generateMap()` and `mapData`. Tile types: 0 grass, 1 tree, 2 rock. |
| `src/fallbacks.ts` | Programmatic texture generation when PNGs are missing. Exports `generateFallbacks(scene)`. Add new fallbacks here if you add new asset keys. |
| `src/gameSceneUtils.ts` | Extracted pure helpers (movement calcs, attack offsets, enemy spawn/AI, UI state) for testability/readability. |
| `src/scenes/GameScene.ts` | The only scene: preload, create, update, and all game logic (player, enemies, combat, UI, touch). Delegates pure logic to utils; use `_methodName` for private-style helpers. |
| `src/types.ts` | Shared types (GameEnemy, Facing, etc.) for DRY/TS safety. |
| `public/` | Static assets. Vite serves these at `/`. Game loads e.g. `grass.png` from root, so files go in `public/` (e.g. `public/grass.png`). |

There is no state management beyond Phaser scenes; no Redux, no global store. Scene state is reset in `GameScene.init()` on restart. See PHASER4_MIGRATION.md for v4 specifics.

## Conventions

- **Imports**: Use explicit `.js` in relative imports for ESM/TS (e.g. `from './constants.js'`); Vite/TS handles extensionless internally but explicit avoids resolver issues.
- **New scenes**: Create under `src/scenes/`, add to the `scene: [...]` array in `main.ts`.
- **New assets**: Load in the scene’s `preload()`. If the asset is optional, ensure a fallback exists in `fallbacks.ts` (keyed by the same string). List new PNGs in `README.md`.
- **Gameplay constants**: Prefer adding and tweaking values in `constants.ts` rather than magic numbers in the scene.
- **Style**: Existing code uses trailing commas, single quotes, arrow funcs for pure logic, and short comments where helpful. Match that style in new code. See PHASER4_MIGRATION.md for v4 notes.

## Phaser-specific

- **Physics**: Arcade only. No matter, no complex bodies. Use `this.physics.add.collider`, `overlap`, and velocity/position. (Phaser 4 RC compatible; see migration doc.)
- **Camera**: Main camera follows the player with `startFollow(player, true, 0.15, 0.15)`. Bounds are set from map dimensions in `constants.ts` (e.g. `MAP_COLS * TILE_SIZE`).
- **Animations**: Created once in `GameScene._createPlayer()`; guarded with `if (!this.anims.exists('idle_up'))` so restarts don’t duplicate. Animation keys follow `idle_*`, `walk_*`, `attack_*` with direction suffix (`up`, `down`, `left`, `right`).
- **Spritesheet**: Player is a 512×512 sheet, 32×32 frames, 16 columns. Frame indices are in `constants.ts` as `FRAMES`; the fallback in `fallbacks.ts` draws a canvas in the same layout. (Shapes/rects preferred over PNGs; see migration for v4 rendering.)

## Testing changes

- npm run test

## README

User-facing docs (controls, setup, assets, gameplay) live in `README.md`. Keep `AGENTS.md` focused on implementation and where to change things.
