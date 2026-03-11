import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// UI fallback textures (hearts, chests, triforce, compass)
// ---------------------------------------------------------------------------

/**
 * Generate UI fallback textures if they don't exist.
 */
export const generateUIFallbacks = (scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void => {
    // ---- Heart full (red) ----
    if (!scene.textures.exists('heart_full')) {
        g.clear();
        g.fillStyle(0xff2222);
        g.fillCircle(5, 5, 5);
        g.fillCircle(11, 5, 5);
        g.fillTriangle(0, 7, 8, 15, 16, 7);
        g.generateTexture('heart_full', 16, 16);
    }

    // ---- Heart empty (dark gray) ----
    if (!scene.textures.exists('heart_empty')) {
        g.clear();
        g.fillStyle(0x444444);
        g.fillCircle(5, 5, 5);
        g.fillCircle(11, 5, 5);
        g.fillTriangle(0, 7, 8, 15, 16, 7);
        g.generateTexture('heart_empty', 16, 16);
    }

    // ---- Heart drop (pickup, slightly smaller / brighter red) ----
    if (!scene.textures.exists('heart_drop')) {
        g.clear();
        g.fillStyle(0xff4444);
        g.fillCircle(5, 5, 4);
        g.fillCircle(11, 5, 4);
        g.fillTriangle(1, 7, 8, 14, 15, 7);
        g.generateTexture('heart_drop', 16, 16);
    }

    // ---- Chest closed (brown box with gold latch) ----
    if (!scene.textures.exists('chest_closed')) {
        g.clear();
        // Body
        g.fillStyle(0x8b5e3c);
        g.fillRoundedRect(2, 8, 28, 20, 3);
        // Lid (darker)
        g.fillStyle(0x6b3e1c);
        g.fillRoundedRect(2, 4, 28, 12, 3);
        // Gold latch
        g.fillStyle(0xffd700);
        g.fillRect(13, 10, 6, 6);
        // Highlight
        g.fillStyle(0xa87848);
        g.fillRect(4, 6, 24, 2);
        g.generateTexture('chest_closed', 32, 32);
    }

    // ---- Chest opened (brown box, lid up, empty inside) ----
    if (!scene.textures.exists('chest_opened')) {
        g.clear();
        // Body
        g.fillStyle(0x8b5e3c);
        g.fillRoundedRect(2, 12, 28, 18, 3);
        // Open interior (dark)
        g.fillStyle(0x3a2010);
        g.fillRect(5, 14, 22, 12);
        // Lid flipped back
        g.fillStyle(0x6b3e1c);
        g.fillRoundedRect(2, 2, 28, 10, 3);
        // Gold latch on lid
        g.fillStyle(0xffd700);
        g.fillRect(13, 4, 6, 4);
        g.generateTexture('chest_opened', 32, 32);
    }

    // ---- Triforce piece (golden triangle, Zelda-style) ----
    if (!scene.textures.exists('triforce_piece')) {
        g.clear();
        // Glow
        g.fillStyle(0xffee88);
        g.fillTriangle(8, 2, 0, 14, 16, 14);
        // Inner gold
        g.fillStyle(0xffd700);
        g.fillTriangle(8, 4, 2, 13, 14, 13);
        // Highlight
        g.fillStyle(0xffff99);
        g.fillTriangle(8, 6, 5, 11, 11, 11);
        g.generateTexture('triforce_piece', 16, 16);
    }

    // ---- Triforce HUD icon (small, for collected-piece indicator) ----
    if (!scene.textures.exists('triforce_hud')) {
        g.clear();
        g.fillStyle(0xffd700);
        g.fillTriangle(8, 1, 1, 14, 15, 14);
        g.generateTexture('triforce_hud', 16, 16);
    }

    // ---- Triforce HUD empty (dimmed, uncollected indicator) ----
    if (!scene.textures.exists('triforce_hud_empty')) {
        g.clear();
        g.fillStyle(0x555544);
        g.fillTriangle(8, 1, 1, 14, 15, 14);
        g.generateTexture('triforce_hud_empty', 16, 16);
    }

    // ---- Compass (collectable item from chest) ----
    if (!scene.textures.exists('compass')) {
        g.clear();
        // Outer ring
        g.fillStyle(0xffd700); // gold
        g.fillCircle(8, 8, 7);
        // Inner circle (face)
        g.fillStyle(0xffffff);
        g.fillCircle(8, 8, 5);
        // Cardinal marks
        g.fillStyle(0x000000);
        g.fillRect(7, 2, 2, 2); // N
        g.fillRect(7, 12, 2, 2); // S
        g.fillRect(2, 7, 2, 2); // W
        g.fillRect(12, 7, 2, 2); // E
        // Needle (red pointing up)
        g.fillStyle(0xff0000);
        g.fillTriangle(8, 4, 6, 8, 10, 8);
        // Needle (white pointing down)
        g.fillStyle(0xcccccc);
        g.fillTriangle(8, 12, 6, 8, 10, 8);
        g.generateTexture('compass', 16, 16);
    }

    // ---- Compass HUD icon (shows in HUD when collected) ----
    if (!scene.textures.exists('compass_hud')) {
        g.clear();
        // Outer ring
        g.fillStyle(0xffd700);
        g.fillCircle(8, 8, 7);
        // Inner circle
        g.fillStyle(0xffffff);
        g.fillCircle(8, 8, 5);
        // Needle
        g.fillStyle(0xff0000);
        g.fillTriangle(8, 3, 5, 9, 11, 9);
        g.generateTexture('compass_hud', 16, 16);
    }

    // ---- Compass HUD empty (dimmed, uncollected indicator) ----
    if (!scene.textures.exists('compass_hud_empty')) {
        g.clear();
        g.fillStyle(0x444444);
        g.fillCircle(8, 8, 7);
        g.fillStyle(0x333333);
        g.fillCircle(8, 8, 5);
        g.generateTexture('compass_hud_empty', 16, 16);
    }

    // ---- Compass arrow indicator (points to closest enemy) ----
    if (!scene.textures.exists('compass_arrow')) {
        g.clear();
        // Arrow / triangle pointing up (will be rotated in game)
        g.fillStyle(0xff4444); // red arrow
        g.fillTriangle(8, 0, 0, 16, 16, 16);
        // Inner highlight
        g.fillStyle(0xff6666);
        g.fillTriangle(8, 4, 4, 14, 12, 14);
        g.generateTexture('compass_arrow', 16, 16);
    }

    // ---- Snorkel (collectable item from chest) ----
    if (!scene.textures.exists('snorkel')) {
        g.clear();
        // Mask (blue/cyan)
        g.fillStyle(0x00ffff);
        g.fillRoundedRect(2, 4, 12, 8, 2);
        // Glass (lighter blue)
        g.fillStyle(0xccffff);
        g.fillRect(4, 6, 8, 4);
        // Snorkel tube (yellowish)
        g.fillStyle(0xffff00);
        g.fillRect(12, 2, 2, 10);
        g.fillRect(10, 10, 4, 2); // mouthpiece
        g.generateTexture('snorkel', 16, 16);
    }

    // ---- Snorkel HUD icon (shows in HUD when collected) ----
    if (!scene.textures.exists('snorkel_hud')) {
        g.clear();
        // Mask
        g.fillStyle(0x00ffff);
        g.fillRoundedRect(4, 6, 8, 6, 1);
        // Snorkel tube
        g.fillStyle(0xffff00);
        g.fillRect(12, 4, 2, 8);
        g.generateTexture('snorkel_hud', 16, 16);
    }

    // ---- Snorkel HUD empty (dimmed) ----
    if (!scene.textures.exists('snorkel_hud_empty')) {
        g.clear();
        g.fillStyle(0x333344);
        g.fillRoundedRect(4, 6, 8, 6, 1);
        g.generateTexture('snorkel_hud_empty', 16, 16);
    }
};
