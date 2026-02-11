import Phaser from 'phaser';

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
//   "Pixel art 32×32 seamless grass/tree/rock tiles, top-down RPG"
//   "Pixel art 16×16 heart icon, red fill, black outline"
// ---------------------------------------------------------------------------

/**
 * Generate any missing textures using Phaser graphics.
 * Safe to call on every scene restart — skips textures that already exist.
 *
 * @param {Phaser.Scene} scene
 */
export function generateFallbacks(scene) {
    const g = scene.add.graphics();

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

    // ---- Player spritesheet ----
    if (!scene.textures.exists('player')) {
        generatePlayerFallback(scene);
    }

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

    g.destroy();
}

// ---------------------------------------------------------------------------
// Player fallback spritesheet (canvas-drawn, 512×512, 16-col grid)
// ---------------------------------------------------------------------------

function generatePlayerFallback(scene) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // dir: 0 = N, 1 = S, 2 = E, 3 = W
    const drawChar = (col, row, dir, isWalk, walkFrame, isAttack) => {
        const x = col * 32;
        const y = row * 32;

        // Body (blue tunic)
        ctx.fillStyle = '#3366cc';
        ctx.fillRect(x + 8, y + 8, 16, 18);

        // Head (skin)
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(x + 10, y + 2, 12, 10);

        // Hair (brown) + eyes by direction
        ctx.fillStyle = '#8B4513';
        if (dir === 0) {
            ctx.fillRect(x + 10, y + 2, 12, 6);
        } else if (dir === 1) {
            ctx.fillRect(x + 10, y + 2, 12, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(x + 12, y + 7, 2, 2);
            ctx.fillRect(x + 18, y + 7, 2, 2);
        } else if (dir === 2) {
            ctx.fillRect(x + 10, y + 2, 12, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(x + 18, y + 7, 2, 2);
        } else {
            ctx.fillRect(x + 10, y + 2, 12, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(x + 12, y + 7, 2, 2);
        }

        // Legs
        ctx.fillStyle = '#2a5db0';
        ctx.fillRect(x + 10, y + 26, 5, 5);
        ctx.fillRect(x + 17, y + 26, 5, 5);

        // Sword (only when attacking)
        if (isAttack) {
            ctx.fillStyle = '#cccccc';
            if (dir === 0)      ctx.fillRect(x + 22, y - 6, 4, 16);
            else if (dir === 1) ctx.fillRect(x + 22, y + 20, 4, 16);
            else if (dir === 2) ctx.fillRect(x + 24, y + 8, 16, 4);
            else                ctx.fillRect(x - 8, y + 8, 16, 4);

            ctx.fillStyle = '#8B6914'; // hilt
            if (dir === 0)      ctx.fillRect(x + 20, y + 8, 8, 3);
            else if (dir === 1) ctx.fillRect(x + 20, y + 18, 8, 3);
            else if (dir === 2) ctx.fillRect(x + 22, y + 6, 3, 8);
            else                ctx.fillRect(x + 7, y + 6, 3, 8);
        }
    };

    // Layout (Phaser frame = row * 16 + col):
    // Row 0: Idle N(0), Idle S(1), Idle E(2), Attack E(3)
    drawChar(0, 0, 0, false, 0, false);
    drawChar(1, 0, 1, false, 0, false);
    drawChar(2, 0, 2, false, 0, false);
    drawChar(3, 0, 2, false, 0, true);

    // Row 1: Walk S1(16), Walk S2(17), Walk E1(18), Walk E2(19)
    drawChar(0, 1, 1, true, 0, false);
    drawChar(1, 1, 1, true, 1, false);
    drawChar(2, 1, 2, true, 0, false);
    drawChar(3, 1, 2, true, 1, false);

    // Row 2: Idle W(32), Attack S(33), Attack E alt(34), Attack W(35)
    drawChar(0, 2, 3, false, 0, false);
    drawChar(1, 2, 1, false, 0, true);
    drawChar(2, 2, 2, false, 0, true);
    drawChar(3, 2, 3, false, 0, true);

    // Row 3: Walk N1(48), Walk N2(49), Walk W1(50), Walk W2(51)
    drawChar(0, 3, 0, true, 0, false);
    drawChar(1, 3, 0, true, 1, false);
    drawChar(2, 3, 3, true, 0, false);
    drawChar(3, 3, 3, true, 1, false);

    // Row 4: Attack N(64)
    drawChar(0, 4, 0, false, 0, true);

    scene.textures.addSpriteSheet('player', canvas, {
        frameWidth: 32,
        frameHeight: 32,
    });
}
