// Tests for scenes/GameScene.ts (matches file-under-test).
// Basic lifecycle/AI/damage tests (mocks Phaser UI for coverage; uses unknown for constructor).
// (UI-heavy; mocks enable low-hanging coverage bump.)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';  // Mocked in setup
import GameScene from './GameScene.js';  // .js specifier

describe('scenes/GameScene.ts', () => {
    let scene: GameScene;

    beforeEach(() => {
        // Use unknown for constructor (super Scene mock in setup).
        scene = new (GameScene as any)();
        // Spy/mocks for methods.
        vi.spyOn(scene, 'anims', 'get').mockReturnValue({ exists: vi.fn().mockReturnValue(false), create: vi.fn(), play: vi.fn() } as any);
    });

    it('init resets state correctly', () => {
        scene.init();
        expect(scene.playerHP).toBe(96);  // MAX_HP
        expect(scene.gameOver).toBe(false);
        expect(scene.victory).toBe(false);
    });

    it('create sets up world/player/enemies/UI (mocks Phaser calls)', () => {
        // Mock scene methods for coverage (add, physics etc from setup).
        // (Avoid deep stubs; checks calls via spies.)
        const createSpy = vi.spyOn(scene as any, '_buildTilemap');
        const playerSpy = vi.spyOn(scene as any, '_createPlayer');
        const enemiesSpy = vi.spyOn(scene as any, '_createEnemies');

        scene.create();

        expect(createSpy).toHaveBeenCalled();
        expect(playerSpy).toHaveBeenCalled();
        expect(enemiesSpy).toHaveBeenCalled();
        // Verifies wrappers/UI setup; expand mocks for full.
    });

    it('update handles game loop and restart (mocks)', () => {
        scene.gameOver = true;
        scene.restartKey = {} as any;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true);
        const restartSpy = vi.spyOn(scene.scene, 'restart').mockImplementation(() => {});

        scene.update(1000, 16);

        expect(restartSpy).toHaveBeenCalled();
    });

    it('damage methods update HP/knockback (uses utils)', () => {
        scene.playerHP = 96;
        scene.lastHitTime = 0;
        scene.player = { setVelocity: vi.fn(), setTint: vi.fn(), clearTint: vi.fn() } as any;

        scene._damagePlayer({ x: 0, y: 0 } as any);  // PositionedObject

        expect(scene.playerHP).toBe(72);  // -24 ENEMY_DMG
        expect(scene.player.setVelocity).toHaveBeenCalled();
    });
});