# Agent guide — Wild Adventure

This file helps AI assistants (and humans) understand the project and make consistent changes.

## Stack & Entry Points

- **Runtime**: Phaser 4 RC (arcade physics). See [PHASER4_MIGRATION.md](PHASER4_MIGRATION.md).
- **Build**: Vite. ES modules throughout; no CommonJS.
- **Entry**: `index.html` → `/src/main.ts` → `new Phaser.Game(config)`
- **Scenes**: `StartScene` (title) → `GameScene` (gameplay)

**Run**: `npm install` then `npm run dev` (dev) or `npm run build` + `npm run preview` (prod).

## Architecture

GameScene orchestrates decoupled systems. No global state; scene resets in `init()`.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ InputSource │────▶│ PlayerController │────▶│ CombatSystem    │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                    │                        │
       ▼                    ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                       GameScene                              │
│  (orchestrates: WorldFactory, EnemySystem, UISystem,        │
│   CollectibleSystem, InputSource)                            │
└─────────────────────────────────────────────────────────────┘
```

## Code Layout

| Path | Role |
|------|------|
| `src/main.ts` | Phaser config (canvas, scale, physics, scene list) |
| `src/constants.ts` | Gameplay constants, chest contents, sprite frame map |
| `src/types.ts` | Shared types: `GameEnemy`, `PlayerIntent`, `InputSource`, `CollectibleType` |
| `src/worldFactory.ts` | World generation: terrain, chests, structures, obstacles |
| `src/map.ts` | Procedural 50×50 tilemap generator |
| `src/systems/` | Decoupled game systems (see below) |
| `src/gameSceneUtils.ts` | Pure helpers for testability |
| `src/fallbacks/` | Programmatic textures when PNGs missing |
| `src/scenes/` | Phaser scenes: `GameScene.ts`, `StartScene.ts` |

## Systems (`src/systems/`)

| System | Responsibility |
|--------|----------------|
| `PlayerController` | Movement, facing, animation, damage, HP |
| `CombatSystem` | Attack timing, sword hitbox, cooldowns |
| `EnemySystem` | Spawning, AI, projectiles, drops |
| `UISystem` | HUD hearts, enemy counter, overlays |
| `CollectibleSystem` | Unified pickup pipeline (hearts, triforce, compass) |
| `InputSource` classes | Device-agnostic input (keyboard, touch) |

## Skills (Detailed Guides)

For implementation details, see the skill files in `.grok/skills/`:

- **[phaser-patterns.md](.grok/skills/phaser-patterns.md)**: Physics, camera, animations, spritesheets
- **[systems-architecture.md](.grok/skills/systems-architecture.md)**: System pattern, adding new systems
- **[input-system.md](.grok/skills/input-system.md)**: PlayerIntent, InputSource, adding gamepad
- **[collectibles.md](.grok/skills/collectibles.md)**: Unified pickup pipeline, adding new items
- **[world-factory.md](.grok/skills/world-factory.md)**: World generation, spawn queries
- **[testing.md](.grok/skills/testing.md)**: Test patterns, mocking Phaser

## Conventions

- **Imports**: Use explicit `.js` in relative imports (e.g., `from './constants.js'`)
- **New scenes**: Create in `src/scenes/`, add to `main.ts` scene list
- **New assets**: Load in `preload()`, add fallback in `fallbacks/`, list in `README.md`
- **Gameplay constants**: Add to `constants.ts`, not magic numbers
- **Style**: Trailing commas, single quotes, arrow funcs for pure logic

## Testing

```bash
npm test            # Watch mode
npm run test:run    # CI run
```

## Documentation

- `README.md` — User-facing (controls, setup, gameplay)
- `AGENTS.md` — Implementation guide (this file)
- `.grok/skills/` — Detailed skill guides for specific areas
