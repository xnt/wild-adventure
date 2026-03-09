// gameSceneUtils.ts — extracted non-UI/pure logic from GameScene.ts
// (Improves readability by separating calcs/effects; enables independent unit tests.)
// Focus: particle effects, projectile math, damage knockback (no direct `this` mutation/UI).
// (GameScene imports/uses these; iterate extraction in future for more coverage.)
// Types reused/adapted from GameScene (intersection for Phaser compat).

import Phaser from 'phaser';
import type { PositionedObject, GameEnemy, Facing, TouchDir, EnemyConfig } from './types.js';
// Constants for enemy AI/math/attack/player.
import {
    ENEMY_SPEED, CHASE_RANGE, MAP_COLS, MAP_ROWS, TILE_SIZE,
    PLAYER_SPEED, ATTACK_RANGE, IFRAMES_DUR, ATTACK_CD,
    MAX_HP, HEART_HP, NUM_ENEMIES,
    ENEMY_CONFIGS,  // For createEnemies variety config.
    TILE_IDS,
} from './constants.js';

/**
 * Creates slash particle effect (pure visual math/animation).
 * Extracted for testability (angles/dist calc).
 */
export const createSlashEffect = (scene: Phaser.Scene, x: number, y: number): void => {
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        const dist  = Phaser.Math.Between(4, 16);
        const px    = x + Math.cos(angle) * dist;
        const py    = y + Math.sin(angle) * dist;

        const particle = scene.add.rectangle(
            px, py,
            Phaser.Math.Between(3, 6), Phaser.Math.Between(3, 6),
            0xffffff, 0.9,
        ).setDepth(7);

        scene.tweens.add({
            targets: particle,
            alpha: 0, scaleX: 0, scaleY: 0,
            x: px + Math.cos(angle) * 20,
            y: py + Math.sin(angle) * 20,
            duration: 200,
            onComplete: () => particle.destroy(),
        });
    }
};

/**
 * Creates death particle effect (random angles/speeds).
 * Extracted for testability (pure tween math).
 */
export const createDeathEffect = (scene: Phaser.Scene, x: number, y: number): void => {
    const colors = [0xff6644, 0xffaa22, 0xffdd44, 0xff4422];
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Phaser.Math.Between(30, 80);
        const size  = Phaser.Math.Between(3, 8);
        const color = Phaser.Utils.Array.GetRandom(colors);

        const p = scene.add.rectangle(x, y, size, size, color, 1).setDepth(8);
        scene.tweens.add({
            targets: p,
            x: x + Math.cos(angle) * speed,
            y: y + Math.sin(angle) * speed,
            alpha: 0, scaleX: 0, scaleY: 0,
            duration: Phaser.Math.Between(300, 600),
            onComplete: () => p.destroy(),
        });
    }
};

/**
 * Calculates projectile params (angle, offset, start pos) for _enemyShoot.
 * Pure math extraction for testability (no scene mutation).
 */
export const calcProjectileParams = (
    enemy: PositionedObject,
    player: PositionedObject,
): { angle: number; startX: number; startY: number } => {
    const angle = Phaser.Math.Angle.Between(
        enemy.x, enemy.y, player.x, player.y,
    );
    // Offset ~half tile toward player.
    const offset = 16;
    const startX = enemy.x + Math.cos(angle) * offset;
    const startY = enemy.y + Math.sin(angle) * offset;
    return { angle, startX, startY };
};

/**
 * Calculates knockback velocity (pure vector math for _damagePlayer).
 * Extracted for testability; takes positioned objects.
 */
export const calcKnockbackVelocity = (
    source: PositionedObject,
    player: PositionedObject,
    force: number = 300,
): { vx: number; vy: number } => {
    const angle = Phaser.Math.Angle.Between(
        source.x, source.y, player.x, player.y,
    );
    return {
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
    };
};

// Add more pure helpers here in iteration (e.g., getFacingFromVelocity).

/**
 * Pure helpers extracted from GameScene.ts for testability/readability.
 */

// getFacingFromVelocity: snaps raw vel to cardinal (used in movement/anim/attack).
// Behavior: prioritizes horiz over vert; zero vel preserves currentFacing (key for idle/attack/sword dir; original logic).
// Default 'down' only on first idle.
export const getFacingFromVelocity = (vx: number, vy: number, currentFacing: Facing = 'down'): Facing => {
    if (vx === 0 && vy === 0) return currentFacing;  // Preserve last facing (fixes sword swing regression).
    // Snap: horiz priority (as original).
    if (Math.abs(vx) >= Math.abs(vy)) {
        return vx > 0 ? 'right' : 'left';
    } else {
        return vy > 0 ? 'down' : 'up';
    }
};

/**
 * Calc normalized vel from raw input vec + speed (mag norm for diagonal).
 * Pure; used in player movement.
 */
export const calcNormalizedVelocity = (inputVx: number, inputVy: number, speed: number): { vx: number; vy: number } => {
    const mag = Math.sqrt(inputVx * inputVx + inputVy * inputVy);
    if (mag === 0) return { vx: 0, vy: 0 };
    return {
        vx: (inputVx / mag) * speed,
        vy: (inputVy / mag) * speed,
    };
};

/**
 * Get anim key from facing + moving state.
 * Pure; covers walk/idle variants.
 */
export const getAnimKey = (facing: Facing, isMoving: boolean): string => {
    return isMoving ? `walk_${facing}` : `idle_${facing}`;
};

/**
 * Calc attack offset based on facing + range.
 * Pure; used for sword/slash pos.
 */
export const calcAttackOffset = (facing: Facing, range: number): { offX: number; offY: number } => {
    let offX = 0;
    let offY = 0;
    switch (facing) {
        case 'up':    offY = -range; break;
        case 'down':  offY =  range; break;
        case 'left':  offX = -range; break;
        case 'right': offX =  range; break;
    }
    return { offX, offY };
};

/**
 * Get sword hitbox dims based on facing (horiz longer).
 * Pure; matches original logic.
 */
export const getSwordDimensions = (facing: Facing): { width: number; height: number } => {
    const isHorizontal = facing === 'left' || facing === 'right';
    return {
        width: isHorizontal ? 40 : 24,
        height: isHorizontal ? 24 : 40,
    };
};

/**
 * Check if attack ready (justPressed + not attacking + cd elapsed).
 * Pure predicate; behavior test for timing/inputs.
 */
export const isAttackReady = (
    justPressed: boolean,
    isAttacking: boolean,
    time: number,
    lastAttackTime: number,
    cd: number,
): boolean => {
    return justPressed && !isAttacking && (time - lastAttackTime) > cd;
};

/**
 * Calc flicker alpha for iframes (sin wave or full).
 * Pure; returns num for setAlpha (no render).
 */
export const calcIframesAlpha = (time: number, lastHitTime: number, dur: number): number => {
    if (time - lastHitTime < dur) {
        return Math.sin(time * 0.02) > 0 ? 0.4 : 1;
    }
    return 1;
};

/**
 * Get heart texture key based on HP state.
 * Pure; used in UI update.
 */
export const getHeartTexture = (playerHP: number, i: number, maxHp: number, heartHp: number): string => {
    return playerHP >= (i + 1) * heartHp ? 'heart_full' : 'heart_empty';
};

/**
 * Calc remaining enemies (simple arith).
 * Pure; for UI text.
 */
export const getRemainingEnemies = (killed: number, total: number): number => {
    return total - killed;
};

// Add more pure helpers here in iteration (e.g., enemy AI branches).

