import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Player fallback spritesheet (canvas-drawn, 512×512, 16-col grid)
// ---------------------------------------------------------------------------

/**
 * Generate the player spritesheet fallback using canvas.
 * Exported for unit testing.
 */
export const generatePlayerFallback = (scene: Phaser.Scene): void => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    // getContext returns CanvasRenderingContext2D | null; assert non-null (always succeeds for '2d').
    const ctx = canvas.getContext('2d')!;

    // dir: 0 = N, 1 = S, 2 = E, 3 = W
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
    // but accepts HTMLCanvasElement at runtime for dynamic sheets.
    scene.textures.addSpriteSheet('player', canvas as unknown as HTMLImageElement, {
        frameWidth: 32,
        frameHeight: 32,
    });
};
