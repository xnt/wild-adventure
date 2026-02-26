import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Tile fallback textures (biomes + obstacles)
// ---------------------------------------------------------------------------

const TILE_SIZE = 32;

const addSpeckles = (
    g: Phaser.GameObjects.Graphics,
    color: number,
    spots: Array<[number, number, number, number]>,
): void => {
    g.fillStyle(color);
    spots.forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
};

/**
 * Generate tile fallback textures if they don't exist.
 */
export const generateTileFallbacks = (scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void => {
    // ---- Plains (green tile with darker spots) ----
    if (!scene.textures.exists('grass')) {
        g.clear();
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        addSpeckles(g, 0x3d7a33, [
            [4, 6, 3, 3],
            [18, 20, 4, 3],
            [26, 8, 3, 4],
            [10, 26, 3, 3],
        ]);
        g.generateTexture('grass', TILE_SIZE, TILE_SIZE);
    }

    // ---- Forest floor (deeper green with leaf flecks) ----
    if (!scene.textures.exists('forest')) {
        g.clear();
        g.fillStyle(0x2f6d3b);
        g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        addSpeckles(g, 0x2b5f33, [
            [6, 5, 4, 4],
            [20, 10, 5, 3],
            [10, 18, 3, 5],
            [24, 24, 4, 4],
        ]);
        addSpeckles(g, 0x3d8c44, [
            [14, 6, 3, 2],
            [4, 20, 3, 3],
            [18, 26, 3, 3],
        ]);
        g.generateTexture('forest', TILE_SIZE, TILE_SIZE);
    }

    // ---- Swamp (murky green with puddles) ----
    if (!scene.textures.exists('swamp')) {
        g.clear();
        g.fillStyle(0x4b6b3c);
        g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        addSpeckles(g, 0x6b8c59, [
            [5, 8, 6, 4],
            [19, 6, 7, 3],
            [8, 22, 6, 4],
        ]);
        addSpeckles(g, 0x334a2a, [
            [4, 18, 4, 3],
            [20, 20, 6, 5],
        ]);
        g.generateTexture('swamp', TILE_SIZE, TILE_SIZE);
    }

    // ---- Snow (icy blue with sparkles) ----
    if (!scene.textures.exists('snow')) {
        g.clear();
        g.fillStyle(0xdfefff);
        g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        addSpeckles(g, 0xc6d6e6, [
            [6, 6, 4, 3],
            [18, 9, 5, 3],
            [8, 20, 4, 4],
        ]);
        addSpeckles(g, 0xf2f8ff, [
            [12, 4, 3, 2],
            [22, 18, 3, 3],
            [4, 26, 4, 3],
        ]);
        g.generateTexture('snow', TILE_SIZE, TILE_SIZE);
    }

    // ---- Tree (trunk + canopy) ----
    if (!scene.textures.exists('tree')) {
        g.clear();
        g.fillStyle(0x2f6d3b);
        g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fillStyle(0x5c3a1e);
        g.fillRect(12, 18, 8, 14);
        g.fillStyle(0x1a5c1a);
        g.fillCircle(16, 12, 12);
        g.fillStyle(0x2d8c2d);
        g.fillCircle(14, 10, 7);
        g.generateTexture('tree', TILE_SIZE, TILE_SIZE);
    }

    // ---- Rock (gray boulder) ----
    if (!scene.textures.exists('rock')) {
        g.clear();
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        g.fillStyle(0x888888);
        g.fillRoundedRect(4, 6, 24, 22, 6);
        g.fillStyle(0xaaaaaa);
        g.fillRoundedRect(6, 8, 18, 14, 4);
        g.fillStyle(0x777777);
        g.fillRect(10, 20, 12, 6);
        g.generateTexture('rock', TILE_SIZE, TILE_SIZE);
    }
};
