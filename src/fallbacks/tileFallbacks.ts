import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Tile fallback textures (grass, tree, rock)
// ---------------------------------------------------------------------------

/**
 * Generate tile fallback textures if they don't exist.
 */
export const generateTileFallbacks = (scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void => {
    // ---- Grass (green tile with darker spots) ----
    if (!scene.textures.exists('grass')) {
        g.clear();
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, 32, 32);
        g.fillStyle(0x3d7a33);
        g.fillRect(4, 6, 3, 3);
        g.fillRect(18, 20, 4, 3);
        g.fillRect(26, 8, 3, 4);
        g.fillRect(10, 26, 3, 3);
        g.generateTexture('grass', 32, 32);
    }

    // ---- Tree (trunk + canopy) ----
    if (!scene.textures.exists('tree')) {
        g.clear();
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, 32, 32);
        g.fillStyle(0x5c3a1e);
        g.fillRect(12, 18, 8, 14);
        g.fillStyle(0x1a5c1a);
        g.fillCircle(16, 12, 12);
        g.fillStyle(0x2d8c2d);
        g.fillCircle(14, 10, 7);
        g.generateTexture('tree', 32, 32);
    }

    // ---- Rock (gray boulder) ----
    if (!scene.textures.exists('rock')) {
        g.clear();
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, 32, 32);
        g.fillStyle(0x888888);
        g.fillRoundedRect(4, 6, 24, 22, 6);
        g.fillStyle(0xaaaaaa);
        g.fillRoundedRect(6, 8, 18, 14, 4);
        g.fillStyle(0x777777);
        g.fillRect(10, 20, 12, 6);
        g.generateTexture('rock', 32, 32);
    }
};
