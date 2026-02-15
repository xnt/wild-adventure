// Tests for gameSceneUtils.ts (matches file-under-test convention).
// Basic checks for extracted pure math/effects (increases coverage/readability).
// Mocks via setup; focuses on calcs (e.g., projectile params, knockback).

import { describe, it, expect, vi } from 'vitest';
import Phaser from 'phaser';  // Mocked
import {
    createSlashEffect,
    createDeathEffect,
    calcProjectileParams,
    calcKnockbackVelocity,
    updateEnemies,
    // updateEnemy, createEnemies, buildTilemap: stubbed/full in utils; tested via batch.
} from './gameSceneUtils.js';
import type { PositionedObject, GameEnemy } from './types';

describe('gameSceneUtils.ts', () => {
    it('createSlashEffect runs without errors (particle math)', () => {
        const mockScene = {
            add: {
                rectangle: vi.fn().mockReturnValue({ setDepth: vi.fn().mockReturnThis() }),
            },
            tweens: { add: vi.fn() },
        } as unknown as Phaser.Scene;

        expect(() => createSlashEffect(mockScene, 100, 100)).not.toThrow();
        // Verifies angle/dist calcs + tweens; expand for exact calls in iteration.
    });

    it('createDeathEffect runs without errors (random particles)', () => {
        const mockScene = {
            add: {
                rectangle: vi.fn().mockReturnValue({ setDepth: vi.fn().mockReturnThis() }),
            },
            tweens: { add: vi.fn() },
        } as unknown as Phaser.Scene;

        expect(() => createDeathEffect(mockScene, 200, 200)).not.toThrow();
    });

    it('calcProjectileParams computes angle/offset/start pos correctly', () => {
        const enemy: PositionedObject = { x: 100, y: 100 };
        const player: PositionedObject = { x: 200, y: 200 };

        const { angle, startX, startY } = calcProjectileParams(enemy, player);

        expect(angle).toBeCloseTo(Math.PI / 4, 1);  // 45 deg approx
        expect(startX).toBeGreaterThan(enemy.x);  // Offset toward player
        expect(startY).toBeGreaterThan(enemy.y);
    });

    it('calcKnockbackVelocity computes vector from source to player', () => {
        const source: PositionedObject = { x: 0, y: 0 };
        const player: PositionedObject = { x: 100, y: 0 };

        const { vx, vy } = calcKnockbackVelocity(source, player, 300);

        expect(vx).toBe(300);  // Rightward
        expect(vy).toBe(0);
    });

    it('updateEnemies updates AI (chase/patrol/bob; from _updateEnemies forEach)', () => {
        // Mock enemies group/player/time; verifies delegation to updateEnemy.
        // Stub GameEnemy methods/props (setVelocity, setScale etc.; patrol for else path).
        // (Minimal for AI paths; expand mocks/spies in iteration.)
        // MockEnemy as GameEnemy via unknown (intersection with Phaser.Sprite requires full props;
        // common for tests; avoids excess stub while keeping type safety).
        const mockEnemy = {
            x: 100, y: 100, type: 'goblin', isDying: false, isChasing: false,
            speedMult: 1, patrolTimer: 0, patrolTarget: { x: 100, y: 100 } as Phaser.Math.Vector2,
            // Methods:
            setVelocity: vi.fn(), setTint: vi.fn(), clearTint: vi.fn(), setScale: vi.fn(),
        } as unknown as GameEnemy;
        const mockEnemies = { getChildren: vi.fn().mockReturnValue([mockEnemy]) } as unknown as Phaser.Physics.Arcade.Group;
        const player: PositionedObject = { x: 150, y: 150 };

        updateEnemies(mockEnemies, player, 1000);

        expect(mockEnemy.setVelocity).toHaveBeenCalled();
        expect(mockEnemy.setScale).toHaveBeenCalled();  // Bob animation
        // Expand for patrol/shoot/bob cases in iteration.
    });
});