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
export function generateFallbacks(scene: Phaser.Scene): void {
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
    // Follows the established pattern: simple shape-based "pixel" art via Phaser
    // graphics; loosely Zelda-inspired but entirely programmatic.
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
    // Zelda-inspired wizard; uses graphics utils only, no sprite PNG required.
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
    // Zelda-inspired; drawn with shapes only.
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

// Exported for unit testing (internal helper; typed for canvas/Phaser texture creation).
// Called by generateFallbacks; exposed to validate attack sword render etc.
// (Keep private-style name; re-evaluate in refactor.)
export function generatePlayerFallback(scene: Phaser.Scene): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    // getContext returns CanvasRenderingContext2D | null; assert non-null (always succeeds for '2d').
    // Avoids implicit any/null errors downstream.
    const ctx = canvas.getContext('2d')!;

    // dir: 0 = N, 1 = S, 2 = E, 3 = W
    // Explicit param types to eliminate implicit any.
    // (col/row: grid pos; dir: cardinal; flags for anim state; walkFrame: 0/1 for alt pose)
    const drawChar = (
        col: number,
        row: number,
        dir: 0 | 1 | 2 | 3,
        isWalk: boolean,
        walkFrame: number,
        isAttack: boolean,
    ): void => {
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

    // Phaser's TextureManager.addSpriteSheet TS def expects string|HTMLImageElement|Texture for source,
    // but accepts HTMLCanvasElement at runtime for dynamic sheets (common pattern in Phaser examples).
    // Cast via unknown (safe, no implicit/any) to satisfy without runtime change.
    // Alternative (graphics-only player sheet) would require more refactor.
    scene.textures.addSpriteSheet('player', canvas as unknown as HTMLImageElement, {
        frameWidth: 32,
        frameHeight: 32,
    });
}
