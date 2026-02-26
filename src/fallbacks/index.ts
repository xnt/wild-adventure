import Phaser from 'phaser';
import { generateTileFallbacks } from './tileFallbacks.js';
import { generateEnemyFallbacks } from './enemyFallbacks.js';
import { generateUIFallbacks } from './uiFallbacks.js';
import { generateStructureFallbacks } from './structureFallbacks.js';
import { generatePlayerFallback } from './playerFallback.js';

// ---------------------------------------------------------------------------
// Fallback texture generation
//
// If the real PNGs are missing, we programmatically create coloured
// rectangles / shapes so the game is still fully playable.
//
// AI prompts for generating real assets:
//   "Pixel art 32×32 top-down hero sprite sheet, 16 columns, 16 rows,
//    walk/idle/attack in 4 directions, transparent background, Zelda style"
//   "Pixel art 32×32 goblin sprite, top-down, Zelda LTTP style"
//   "Pixel art 32×32 wizrobe/magician sprite, top-down, Zelda style"
//   "Pixel art 32×32 lynel centaur sprite, top-down, Zelda style"
//   "Pixel art 16×16 magic projectile orb, blue glow, Zelda style"
//   "Pixel art 32×32 seamless grass/tree/rock tiles, top-down RPG"
//   "Pixel art 16×16 heart icon, red fill, black outline"
// ---------------------------------------------------------------------------

/**
 * Generate any missing textures using Phaser graphics.
 * Safe to call on every scene restart — skips textures that already exist.
 */
export const generateFallbacks = (scene: Phaser.Scene): void => {
    const g = scene.add.graphics();

    // Generate all fallback categories
    generateTileFallbacks(scene, g);
    generateEnemyFallbacks(scene, g);
    generateUIFallbacks(scene, g);
    generateStructureFallbacks(scene, g);

    // Player spritesheet (uses canvas, not graphics)
    if (!scene.textures.exists('player')) {
        generatePlayerFallback(scene);
    }

    g.destroy();
};

// Re-export generatePlayerFallback for tests that need it directly
export { generatePlayerFallback } from './playerFallback';
