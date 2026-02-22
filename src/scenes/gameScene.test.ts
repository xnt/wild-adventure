// Tests for scenes/GameScene.ts (matches file-under-test).
// Basic lifecycle/AI/damage tests (mocks Phaser UI for coverage; uses unknown for constructor).
// (UI-heavy; mocks enable low-hanging coverage bump.)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';  // Mocked in setup
import GameScene from './GameScene';

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
        // In Phaser 4, ScenePlugin.restart returns the plugin itself (sig: (data?: object) => ScenePlugin).
        // Mock impl returns the plugin to match type (prevents TS error on spy).
        const restartSpy = vi.spyOn(scene.scene, 'restart').mockImplementation(() => scene.scene);

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

    it('init resets compass state', () => {
        scene.init();
        expect(scene.hasCompass).toBe(false);
        expect(scene.triforcePieces).toBe(0);
    });

    it('update returns early when gameOver or victory', () => {
        scene.gameOver = true;
        scene.restartKey = {} as any;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(false);
        
        // Should not throw and should return early
        expect(() => scene.update(1000, 16)).not.toThrow();
    });

    it('update returns early when victory', () => {
        scene.victory = true;
        scene.restartKey = {} as any;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(false);
        
        expect(() => scene.update(1000, 16)).not.toThrow();
    });

    it('_damagePlayer respects iframes', () => {
        scene.playerHP = 96;
        scene.lastHitTime = 900;  // Recent hit
        scene.player = { setVelocity: vi.fn(), setTint: vi.fn(), clearTint: vi.fn() } as any;
        // Mock time.now to be within iframes duration (800ms)
        scene.time = { now: 1000, delayedCall: vi.fn() } as any;

        scene._damagePlayer({ x: 0, y: 0 } as any);

        // HP should not change due to iframes
        expect(scene.playerHP).toBe(96);
    });

    it('_damagePlayer triggers game over when HP reaches 0', () => {
        scene.playerHP = 24;  // One hit from death
        scene.lastHitTime = 0;
        scene.player = { setVelocity: vi.fn(), setTint: vi.fn(), clearTint: vi.fn() } as any;
        const showGameOverSpy = vi.spyOn(scene as any, '_showGameOver').mockImplementation(() => {});

        scene._damagePlayer({ x: 0, y: 0 } as any);

        expect(scene.playerHP).toBe(0);
        expect(showGameOverSpy).toHaveBeenCalled();
    });

    it('_damageEnemy decrements HP and kills when depleted', () => {
        const mockEnemy = {
            hp: 1,
            type: 'goblin',
            isDying: false,
            setTint: vi.fn(),
            clearTint: vi.fn(),
            active: true,
        } as any;
        const killSpy = vi.spyOn(scene as any, '_killEnemy').mockImplementation(() => {});

        scene._damageEnemy(mockEnemy);

        expect(mockEnemy.hp).toBe(0);
        expect(killSpy).toHaveBeenCalledWith(mockEnemy);
    });

    it('_damageEnemy does not kill when HP remains', () => {
        const mockEnemy = {
            hp: 3,  // Lynel
            type: 'lynel',
            isDying: false,
            setTint: vi.fn(),
            clearTint: vi.fn(),
            active: true,
        } as any;
        const killSpy = vi.spyOn(scene as any, '_killEnemy').mockImplementation(() => {});

        scene._damageEnemy(mockEnemy);

        expect(mockEnemy.hp).toBe(2);
        expect(killSpy).not.toHaveBeenCalled();
    });

    it('_damageEnemy skips dying enemies', () => {
        const mockEnemy = {
            hp: 1,
            isDying: true,
            setTint: vi.fn(),
        } as any;

        scene._damageEnemy(mockEnemy);

        // HP should not change
        expect(mockEnemy.hp).toBe(1);
        expect(mockEnemy.setTint).not.toHaveBeenCalled();
    });

    it('_onPlayerHit skips dying enemies', () => {
        const mockEnemy = { isDying: true } as any;
        const damageSpy = vi.spyOn(scene as any, '_damagePlayer').mockImplementation(() => {});

        scene._onPlayerHit({} as any, mockEnemy);

        expect(damageSpy).not.toHaveBeenCalled();
    });

    it('_onPlayerHit calls _damagePlayer for active enemies', () => {
        const mockEnemy = { isDying: false, x: 10, y: 10 } as any;
        const damageSpy = vi.spyOn(scene as any, '_damagePlayer').mockImplementation(() => {});

        scene._onPlayerHit({} as any, mockEnemy);

        expect(damageSpy).toHaveBeenCalledWith(mockEnemy);
    });

    it('_onPlayerHitByProj calls _damagePlayer and destroys projectile', () => {
        const mockProj = { x: 10, y: 10, destroy: vi.fn() } as any;
        const damageSpy = vi.spyOn(scene as any, '_damagePlayer').mockImplementation(() => {});

        scene._onPlayerHitByProj({} as any, mockProj);

        expect(damageSpy).toHaveBeenCalled();
        expect(mockProj.destroy).toHaveBeenCalled();
    });
});