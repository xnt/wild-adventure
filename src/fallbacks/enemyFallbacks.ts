import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Enemy fallback textures (goblin, wizrobe, lynel, enemy_proj)
// ---------------------------------------------------------------------------

/**
 * Generate enemy fallback textures if they don't exist.
 */
export const generateEnemyFallbacks = (scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void => {
    // ---- Goblin (greenish creature with red eyes) ----
    if (!scene.textures.exists('goblin')) {
        g.clear();
        g.fillStyle(0x5b8c3a);
        g.fillRoundedRect(6, 4, 20, 24, 4);
        g.fillStyle(0x4a7a2e);
        g.fillCircle(16, 8, 8);
        g.fillStyle(0xff0000);
        g.fillCircle(12, 7, 2);
        g.fillCircle(20, 7, 2);
        g.fillStyle(0x3a5c22);
        g.fillRect(2, 12, 5, 10);
        g.fillRect(25, 12, 5, 10);
        g.generateTexture('goblin', 32, 32);
    }

    // ---- Wizrobe (purple-robed mage that shoots slow magic projectiles) ----
    if (!scene.textures.exists('wizrobe')) {
        g.clear();
        // Robe
        g.fillStyle(0x6a0dad); // purple
        g.fillRoundedRect(4, 6, 24, 24, 4);
        // Pointy hat
        g.fillStyle(0x4b0082);
        g.fillTriangle(16, 0, 6, 12, 26, 12);
        // Face
        g.fillStyle(0xffcc99);
        g.fillCircle(16, 14, 5);
        // Glowing eyes
        g.fillStyle(0x00ffff);
        g.fillCircle(13, 13, 1.5);
        g.fillCircle(19, 13, 1.5);
        g.generateTexture('wizrobe', 32, 32);
    }

    // ---- Lynel (slow centaur-like warrior, 3-hit tank) ----
    if (!scene.textures.exists('lynel')) {
        g.clear();
        // Horse-like body
        g.fillStyle(0xa0522d); // sienna brown
        g.fillRoundedRect(4, 12, 24, 16, 4);
        // Lion head + mane
        g.fillStyle(0xd2691e); // chocolate
        g.fillCircle(16, 8, 10);
        g.fillStyle(0xb8860b); // golden mane
        g.fillCircle(16, 8, 12);
        // Red eyes
        g.fillStyle(0xff0000);
        g.fillCircle(12, 7, 2);
        g.fillCircle(20, 7, 2);
        // Legs
        g.fillStyle(0x8b4513);
        g.fillRect(8, 24, 4, 8);
        g.fillRect(20, 24, 4, 8);
        g.generateTexture('lynel', 32, 32);
    }

    // ---- Enemy projectile (slow magic orb from Wizrobe) ----
    if (!scene.textures.exists('enemy_proj')) {
        g.clear();
        // Blue glowing orb
        g.fillStyle(0x00ffff);
        g.fillCircle(8, 8, 6);
        g.fillStyle(0x0088ff);
        g.fillCircle(8, 8, 3);
        // Highlight
        g.fillStyle(0xffffff);
        g.fillCircle(6, 6, 2);
        g.generateTexture('enemy_proj', 16, 16);
    }
};
