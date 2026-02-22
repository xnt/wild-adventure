import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Structure fallback textures (decorative multi-tile landmarks)
// ---------------------------------------------------------------------------

/**
 * Generate structure fallback textures if they don't exist.
 */
export const generateStructureFallbacks = (scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void => {
    // ---- Mesoamerican Pyramid (4x4 tiles = 128x128) ----
    if (!scene.textures.exists('pyramid')) {
        g.clear();
        // Sky/grass background
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, 128, 128);
        // Pyramid base (stepped)
        g.fillStyle(0xc9a868); // sandstone
        g.fillRect(8, 96, 112, 24);
        g.fillStyle(0xb89858);
        g.fillRect(16, 72, 96, 24);
        g.fillStyle(0xa88848);
        g.fillRect(24, 48, 80, 24);
        g.fillStyle(0x987838);
        g.fillRect(32, 24, 64, 24);
        // Temple top
        g.fillStyle(0x785828);
        g.fillRect(44, 8, 40, 16);
        // Entrance (dark)
        g.fillStyle(0x222222);
        g.fillRect(56, 100, 16, 20);
        // Stone details
        g.fillStyle(0x887848);
        for (let i = 0; i < 5; i++) {
            g.fillRect(20 + i * 20, 80, 2, 12);
        }
        g.generateTexture('pyramid', 128, 128);
    }

    // ---- Canadian Totem (2x4 tiles = 64x128) ----
    if (!scene.textures.exists('totem')) {
        g.clear();
        // Grass background
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, 64, 128);
        // Main pole
        g.fillStyle(0x8b4513);
        g.fillRect(20, 16, 24, 104);
        // Face 1 (top) - Eagle
        g.fillStyle(0xcd853f);
        g.fillCircle(32, 24, 14);
        g.fillStyle(0x000000);
        g.fillCircle(26, 22, 3);
        g.fillCircle(38, 22, 3);
        g.fillStyle(0xffa500);
        g.fillTriangle(32, 20, 28, 32, 36, 32); // beak
        // Wings
        g.fillStyle(0x8b4513);
        g.fillRect(4, 28, 16, 8);
        g.fillRect(44, 28, 16, 8);
        // Face 2 (middle) - Bear
        g.fillStyle(0xa0522d);
        g.fillCircle(32, 56, 12);
        g.fillStyle(0x000000);
        g.fillCircle(26, 54, 2);
        g.fillCircle(38, 54, 2);
        g.fillRect(28, 60, 8, 4);
        // Face 3 (bottom) - Fish
        g.fillStyle(0x4682b4);
        g.fillEllipse(32, 90, 20, 12);
        g.fillStyle(0x000000);
        g.fillCircle(26, 88, 2);
        // Base
        g.fillStyle(0x654321);
        g.fillRect(16, 112, 32, 12);
        g.generateTexture('totem', 64, 128);
    }

    // ---- Teepee (3x3 tiles = 96x96) ----
    if (!scene.textures.exists('teepee')) {
        g.clear();
        // Grass background
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, 96, 96);
        // Teepee body (tan canvas)
        g.fillStyle(0xdeb887);
        g.fillTriangle(48, 8, 8, 88, 88, 88);
        // Darker shading
        g.fillStyle(0xc9a868);
        g.fillTriangle(48, 8, 48, 88, 88, 88);
        // Entrance
        g.fillStyle(0x222222);
        g.fillTriangle(48, 60, 36, 88, 60, 88);
        // Poles sticking out top
        g.fillStyle(0x8b4513);
        g.fillRect(44, 0, 3, 20);
        g.fillRect(50, 0, 3, 22);
        g.fillRect(47, 2, 3, 18);
        // Decorative pattern (zigzag)
        g.fillStyle(0x8b0000);
        for (let i = 0; i < 5; i++) {
            g.fillRect(24 + i * 12, 40 + (i % 2) * 6, 8, 4);
        }
        g.generateTexture('teepee', 96, 96);
    }

    // ---- Tiny Castle (4x4 tiles = 128x128) ----
    if (!scene.textures.exists('castle')) {
        g.clear();
        // Grass background
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, 128, 128);
        // Main wall
        g.fillStyle(0x808080);
        g.fillRect(16, 48, 96, 72);
        // Left tower
        g.fillStyle(0x696969);
        g.fillRect(8, 24, 28, 96);
        g.fillStyle(0x4169e1); // blue roof
        g.fillTriangle(22, 4, 4, 28, 40, 28);
        // Right tower
        g.fillStyle(0x696969);
        g.fillRect(92, 24, 28, 96);
        g.fillStyle(0x4169e1);
        g.fillTriangle(106, 4, 88, 28, 124, 28);
        // Center tower
        g.fillStyle(0x778899);
        g.fillRect(44, 16, 40, 60);
        g.fillStyle(0xb22222); // red roof
        g.fillTriangle(64, 0, 40, 20, 88, 20);
        // Gate
        g.fillStyle(0x654321);
        g.fillRect(48, 80, 32, 40);
        g.fillStyle(0x222222);
        g.fillRect(52, 84, 24, 36);
        // Battlements
        g.fillStyle(0x808080);
        for (let i = 0; i < 6; i++) {
            g.fillRect(20 + i * 16, 44, 8, 8);
        }
        // Windows
        g.fillStyle(0xffff00);
        g.fillRect(18, 60, 8, 12);
        g.fillRect(102, 60, 8, 12);
        g.fillRect(56, 40, 6, 10);
        g.fillRect(66, 40, 6, 10);
        g.generateTexture('castle', 128, 128);
    }

    // ---- Temple of Time (5x4 tiles = 160x128) ----
    if (!scene.textures.exists('temple_time')) {
        g.clear();
        // Grass background
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, 160, 128);
        // Base platform
        g.fillStyle(0xd3d3d3);
        g.fillRect(8, 104, 144, 20);
        g.fillStyle(0xc0c0c0);
        g.fillRect(16, 88, 128, 16);
        // Main building
        g.fillStyle(0xe8e8e8);
        g.fillRect(24, 40, 112, 48);
        // Roof (triangular pediment)
        g.fillStyle(0xb8b8b8);
        g.fillTriangle(80, 8, 16, 44, 144, 44);
        // Columns
        g.fillStyle(0xffffff);
        for (let i = 0; i < 6; i++) {
            g.fillRect(28 + i * 20, 44, 8, 44);
        }
        // Door (sacred)
        g.fillStyle(0x4169e1);
        g.fillRect(64, 56, 32, 32);
        g.fillStyle(0xffd700);
        g.fillTriangle(80, 60, 68, 76, 92, 76);
        // Windows
        g.fillStyle(0x87ceeb);
        g.fillRect(36, 56, 12, 16);
        g.fillRect(112, 56, 12, 16);
        // Spire
        g.fillStyle(0xffd700);
        g.fillTriangle(80, 0, 76, 12, 84, 12);
        g.generateTexture('temple_time', 160, 128);
    }

    // ---- Stonehenge (5x3 tiles = 160x96) ----
    if (!scene.textures.exists('stonehenge')) {
        g.clear();
        // Grass background
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, 160, 96);
        // Standing stones (outer ring)
        g.fillStyle(0x696969);
        // Left pair
        g.fillRect(16, 32, 16, 56);
        g.fillRect(40, 32, 16, 56);
        g.fillRect(12, 28, 48, 12); // lintel
        // Center pair
        g.fillRect(64, 24, 16, 64);
        g.fillRect(80, 24, 16, 64);
        g.fillRect(60, 16, 40, 12); // lintel
        // Right pair
        g.fillRect(104, 32, 16, 56);
        g.fillRect(128, 32, 16, 56);
        g.fillRect(100, 28, 48, 12); // lintel
        // Inner stones (smaller)
        g.fillStyle(0x808080);
        g.fillRect(52, 52, 10, 36);
        g.fillRect(98, 52, 10, 36);
        // Fallen stone
        g.fillStyle(0x5a5a5a);
        g.fillRect(68, 76, 24, 10);
        // Moss/lichen
        g.fillStyle(0x556b2f);
        g.fillRect(18, 70, 8, 6);
        g.fillRect(106, 72, 6, 8);
        g.fillRect(82, 50, 6, 6);
        g.generateTexture('stonehenge', 160, 96);
    }

    // ---- Abandoned Cabin (3x3 tiles = 96x96) ----
    if (!scene.textures.exists('cabin')) {
        g.clear();
        // Grass background
        g.fillStyle(0x4a8c3f);
        g.fillRect(0, 0, 96, 96);
        // Cabin base (weathered wood)
        g.fillStyle(0x6b4423);
        g.fillRect(12, 40, 72, 48);
        // Roof
        g.fillStyle(0x4a3520);
        g.fillTriangle(48, 12, 4, 44, 92, 44);
        // Roof shingles
        g.fillStyle(0x3a2510);
        g.fillRect(20, 32, 56, 4);
        g.fillRect(28, 24, 40, 4);
        // Door (broken/ajar)
        g.fillStyle(0x2a1a0a);
        g.fillRect(38, 56, 20, 32);
        g.fillStyle(0x4a3a2a);
        g.fillRect(40, 58, 8, 30); // door slightly open
        // Windows (boarded)
        g.fillStyle(0x222222);
        g.fillRect(18, 52, 14, 14);
        g.fillRect(64, 52, 14, 14);
        // Boards on windows
        g.fillStyle(0x5a4a3a);
        g.fillRect(16, 56, 18, 3);
        g.fillRect(22, 50, 3, 18);
        g.fillRect(62, 56, 18, 3);
        // Chimney
        g.fillStyle(0x8b4513);
        g.fillRect(68, 16, 12, 20);
        // Overgrown vegetation
        g.fillStyle(0x228b22);
        g.fillCircle(8, 84, 8);
        g.fillCircle(88, 80, 10);
        g.fillCircle(16, 76, 6);
        g.generateTexture('cabin', 96, 96);
    }
};
