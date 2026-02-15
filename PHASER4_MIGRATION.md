# Phaser 4 Migration Guide

## Summary
This document outlines how we migrated "Wild Adventure" (a Phaser-based top-down game using Arcade Physics, rectangles/shapes for hitboxes/particles/UI, and Graphics for programmatic textures/no PNG sprites) from Phaser 3.80 to 4.0.0-rc.6. It's designed to help others perform similar migrations—focusing on steps, verification, adaptations, and lessons learned. (Phaser 4's RC is available now via npm; expect stable release post-2025.)

## Migration Process
1. **Assess Compatibility**: Inspected Phaser 4 (via `npm info phaser@beta` + temp install + types/changelog) for core features. Confirmed Arcade Physics, GameObjects, and rendering APIs align closely with Phaser 3 for minimal disruption.
2. **Update Dependency**: Changed `package.json` to `"phaser": "^4.0.0-rc.6"`, then ran `npm install` (updates lockfile; use ESM build via package `"module"` field for Vite/TS compatibility).
3. **Verify & Adapt Code**: Ran `npm run type-check`, tests (`vitest`), and build (`vite build`). Fixed one minor TS issue in tests for `ScenePlugin.restart` return sig (common in major upgrades).
4. **Test Thoroughly**: All unit tests (now 26, covering utils, scenes, physics, fallbacks) passed; build succeeded (1.5MB bundle, as expected with full Phaser).

## Shapes, Graphics & Rendering
Shapes (e.g., `Phaser.GameObjects.Rectangle` for sword hitboxes/particles/victory effects/UI overlays) and `Graphics` (for fallback textures via `fillRect`/`fillCircle`/`fillTriangle`/`generateTexture`) work seamlessly:
- **API & Behavior**: Factories like `this.add.rectangle(x, y, w, h, color, alpha)`, physics enabling (`this.physics.add.existing(rect)`), and drawing methods remain identical. Physics bodies, tweens, and depths behave the same.
- **Improvements in Phaser 4**: Rendering now uses the new WebGL system (RenderNodes for "Flat" batching + global state management). This yields better performance/batching for shape-heavy games like ours (simple rects quads are optimized; no texture swaps). Bonus: `Rectangle` supports rounded corners natively (via `radius`); Graphics adds `pathDetailThreshold` for complex paths (configurable in game config).
- **Reference & Verification**: See Phaser 4's `changelog/4.0/Phaser 4 Rendering Concepts.md` (Graphics/Shape API section): "The `Graphics` game object is largely unchanged, as is the `Shape` which uses the same render systems, but there are a couple of improvements." Types in `types/phaser.d.ts` and source confirm matching factories. Our fallbacks (in `fallbacks.ts`) and usage (in `GameScene.ts`/`gameSceneUtils.ts`) required no changes—textures/canvas spritesheets also compatible.

(No deprecations hit us; avoided removed items like `Geom.Point` or `Math.PI2`.)

## Other Key Changes & Adaptations
- **Arcade Physics**: Fully preserved (colliders, overlaps, bodies on sprites/rects/groups); gravity/config unchanged.
- **Game Config & Scenes**: `pixelArt`, `scale`, input, anims, tweens, cameras all identical. Minor comment updates in `main.ts`/`GameScene.ts`.
- **Tests/Mocks**: `vitest.setup.ts` mocks (for Scene/Graphics/Math) worked without mods (v4 exports align); one test spy adjusted for stricter typing.
- **Build/Deps**: Vite/TS setup seamless (ESM entry); no vite.config.ts changes.

## Benefits & Recommendations for Your Migration
- **Why Phaser 4**: Renderer overhaul (WebGL state/quad batching) boosts perf for shape/rect games—ours saw no regressions, potential gains on complex scenes.
- **Tips**: Always pin RC (`^4.0.0-rc.6`), inspect `/node_modules/phaser/changelog/4.0/` + types first, mock heavily for tests, run full type-check/build. For shapes, start with basics (add.rectangle works out-of-box).
- **Files Updated**: `package.json` (dep/desc), `src/scenes/gameScene.test.ts` (TS compat), `PHASER4_MIGRATION.md`, `src/main.ts` (docs), plus extracts in `gameSceneUtils.ts`/`types.ts`/`GameScene.ts` for testability (see later refactors).

Game remains fully playable with identical shape-based behavior + modernized renderer. Tests/build confirmed; try `npm run dev`!

(Details in git history if applicable.)