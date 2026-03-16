// Tests for systems/playerController.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerController } from './playerController.js';
import { EventBus } from './eventBus.js';
import type { PlayerIntent } from '../types.js';

describe('systems/playerController.ts', () => {
    let controller: PlayerController;
    let mockScene: any;
    let eventBus: EventBus;

    beforeEach(() => {
        // Create a mock Phaser scene
        mockScene = {
            physics: {
                add: {
                    sprite: vi.fn().mockReturnValue({
                        setDepth: vi.fn().mockReturnThis(),
                        setCollideWorldBounds: vi.fn().mockReturnThis(),
                        setAcceleration: vi.fn().mockReturnThis(),
                        setDrag: vi.fn().mockReturnThis(),
                        setMaxVelocity: vi.fn().mockReturnThis(),
                        body: { 
                            setSize: vi.fn().mockReturnThis(), 
                            setOffset: vi.fn().mockReturnThis(),
                            velocity: { x: 0, y: 0 }
                        },
                        play: vi.fn().mockReturnThis(),
                        setVelocity: vi.fn().mockReturnThis(),
                        setAlpha: vi.fn().mockReturnThis(),
                        setTint: vi.fn().mockReturnThis(),
                        clearTint: vi.fn().mockReturnThis(),
                        x: 100,
                        y: 100,
                        anims: { currentAnim: { key: 'idle_down' } },
                    }),
                },
            },
            cameras: { main: { shake: vi.fn() } },
            time: { delayedCall: vi.fn() },
            anims: {
                exists: vi.fn().mockReturnValue(true),
                create: vi.fn(),
            },
        };

        eventBus = new EventBus();
        controller = new PlayerController(mockScene, eventBus);
    });

    describe('createPlayer', () => {
        it('creates player sprite at given position and sets default physics', () => {
            controller.createAnimations({ IDLE_N: 0, IDLE_S: 1, IDLE_E: 2, IDLE_W: 32 });
            controller.createPlayer(100, 200, 1);

            expect(mockScene.physics.add.sprite).toHaveBeenCalledWith(100, 200, 'player', 1);
            expect(controller.player.setDrag).toHaveBeenCalled();
            expect(controller.player.setMaxVelocity).toHaveBeenCalled();
        });
    });

    describe('biome physics', () => {
        it('sets snow physics correctly', () => {
            controller.createPlayer(100, 100, 1);
            // @ts-ignore - TILE_IDS.SNOW is 5
            controller.setBiome(5); 
            
            // Should set low drag and higher max velocity
            expect(controller.player.setDrag).toHaveBeenCalledWith(150);
            expect(controller.player.setMaxVelocity).toHaveBeenCalledWith(160 * 1.3);
        });

        it('sets swamp physics correctly', () => {
            controller.createPlayer(100, 100, 1);
            // @ts-ignore - TILE_IDS.SWAMP is 4
            controller.setBiome(4); 
            
            // Should set normal drag and lower max velocity
            expect(controller.player.setDrag).toHaveBeenCalledWith(2500);
            expect(controller.player.setMaxVelocity).toHaveBeenCalledWith(160 * 0.6);
        });
    });

    describe('update with PlayerIntent', () => {
        it('applies acceleration from intent', () => {
            controller.createAnimations({ IDLE_S: 1, WALK_S1: 2, WALK_S2: 3 });
            controller.createPlayer(100, 100, 1);
            
            const intent: PlayerIntent = { moveX: 0, moveY: 1, attack: false };
            controller.update(1000, intent);
            
            // Should have called setAcceleration
            expect(controller.player.setAcceleration).toHaveBeenCalledWith(0, 2000);
        });

        it('returns true when velocity is non-zero', () => {
            controller.createAnimations({ IDLE_S: 1, WALK_S1: 2, WALK_S2: 3 });
            controller.createPlayer(100, 100, 1);
            
            // Mock non-zero velocity
            (controller.player.body as any).velocity = { x: 10, y: 0 };
            
            const intent: PlayerIntent = { moveX: 1, moveY: 0, attack: false };
            const result = controller.update(1000, intent);
            
            expect(result).toBe(true);
        });

        it('returns false when not moving', () => {
            controller.createAnimations({ IDLE_S: 1 });
            controller.createPlayer(100, 100, 1);
            
            const intent: PlayerIntent = { moveX: 0, moveY: 0, attack: false };
            const result = controller.update(1000, intent);
            
            expect(result).toBe(false);
        });

        it('returns false when attacking', () => {
            controller.createAnimations({ IDLE_S: 1 });
            controller.createPlayer(100, 100, 1);
            controller.setAttacking(true);
            
            const intent: PlayerIntent = { moveX: 1, moveY: 0, attack: false };
            const result = controller.update(1000, intent);
            
            expect(result).toBe(false);
        });
    });

    describe('animation helpers', () => {
        it('playIdle plays idle animation for current facing', () => {
            controller.createAnimations({ IDLE_N: 0, IDLE_S: 1, IDLE_E: 2, IDLE_W: 32 });
            controller.createPlayer(100, 100, 1);
            controller.facing = 'down';
            controller.playIdle();
            expect(controller.player.play).toHaveBeenCalledWith('idle_down', true);
        });

        it('playAttack plays attack animation for current facing', () => {
            controller.createAnimations({ ATK_N: 64, ATK_S: 33, ATK_E: 3, ATK_W: 35 });
            controller.createPlayer(100, 100, 1);
            controller.facing = 'right';
            controller.playAttack();
            expect(controller.player.play).toHaveBeenCalledWith('attack_right', true);
        });
    });

    describe('stop', () => {
        it('stops player velocity', () => {
            controller.createAnimations({ IDLE_S: 1 });
            controller.createPlayer(100, 100, 1);
            controller.stop();
            expect(controller.player.setVelocity).toHaveBeenCalledWith(0, 0);
        });
    });

    describe('getPosition', () => {
        it('returns player position', () => {
            controller.createAnimations({ IDLE_S: 1 });
            controller.createPlayer(100, 100, 1);
            const pos = controller.getPosition();
            expect(pos).toEqual({ x: 100, y: 100 });
        });
    });

    describe('setAttacking', () => {
        it('sets attacking state', () => {
            controller.setAttacking(true);
            expect(controller.isAttacking).toBe(true);
        });
    });

    describe('eventBus', () => {
        it('emits player:damaged event when player takes damage', () => {
            const onDamageSpy = vi.fn();
            eventBus.on('player:damaged', onDamageSpy);
            controller.setHP(96);

            // Create player mock with proper position
            controller.player = {
                x: 100,
                y: 100,
                setVelocity: vi.fn(),
                setTint: vi.fn(),
                clearTint: vi.fn(),
                setAlpha: vi.fn(),
            } as any;

            // Ensure time.delayedCall is mocked
            mockScene.time = { now: 1000, delayedCall: vi.fn() };
            controller.takeDamage({ x: 0, y: 0 }, 2000); // After iframes

            expect(onDamageSpy).toHaveBeenCalledWith({ hp: expect.any(Number), maxHp: expect.any(Number) });
        });

        it('emits player:died event when HP reaches 0', () => {
            const onDeathSpy = vi.fn();
            eventBus.on('player:died', onDeathSpy);
            controller.setHP(24); // One hit from death

            // Create player mock with proper position
            controller.player = {
                x: 100,
                y: 100,
                setVelocity: vi.fn(),
                setTint: vi.fn(),
                clearTint: vi.fn(),
                setAlpha: vi.fn(),
            } as any;

            // Ensure time.delayedCall is mocked
            mockScene.time = { now: 1000, delayedCall: vi.fn() };
            controller.takeDamage({ x: 0, y: 0 }, 2000);

            expect(onDeathSpy).toHaveBeenCalledWith(undefined);
        });
    });
});