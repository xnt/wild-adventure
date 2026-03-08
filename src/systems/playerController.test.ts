// Tests for systems/playerController.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerController } from './playerController.js';

describe('systems/playerController.ts', () => {
    let controller: PlayerController;
    let mockScene: any;

    beforeEach(() => {
        // Create a mock Phaser scene
        mockScene = {
            physics: {
                add: {
                    sprite: vi.fn().mockReturnValue({
                        setDepth: vi.fn().mockReturnThis(),
                        setCollideWorldBounds: vi.fn().mockReturnThis(),
                        body: { setSize: vi.fn().mockReturnThis(), setOffset: vi.fn().mockReturnThis() },
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
            input: {
                keyboard: {
                    createCursorKeys: vi.fn().mockReturnValue({
                        left: { isDown: false },
                        right: { isDown: false },
                        up: { isDown: false },
                        down: { isDown: false },
                    }),
                    addKeys: vi.fn().mockReturnValue({
                        up: { isDown: false },
                        down: { isDown: false },
                        left: { isDown: false },
                        right: { isDown: false },
                    }),
                    addKey: vi.fn().mockReturnValue({}),
                },
            },
            cameras: { main: { shake: vi.fn() } },
            time: { delayedCall: vi.fn() },
            anims: {
                exists: vi.fn().mockReturnValue(true),
                create: vi.fn(),
            },
        };

        controller = new PlayerController(mockScene);
    });

    describe('init', () => {
        it('initializes input keys', () => {
            controller.initInput();
            expect(mockScene.input.keyboard.createCursorKeys).toHaveBeenCalled();
            expect(mockScene.input.keyboard.addKeys).toHaveBeenCalled();
            expect(mockScene.input.keyboard.addKey).toHaveBeenCalled();
        });
    });

    describe('createPlayer', () => {
        it('creates player sprite at given position', () => {
            controller.initInput();
            controller.createAnimations({ IDLE_N: 0, IDLE_S: 1, IDLE_E: 2, IDLE_W: 32 });
            controller.createPlayer(100, 200, 1);

            expect(mockScene.physics.add.sprite).toHaveBeenCalledWith(100, 200, 'player', 1);
        });
    });

    describe('HP management', () => {
        it('setHP sets player HP', () => {
            controller.setHP(50);
            expect(controller.getHP()).toBe(50);
        });

        it('heal increases HP up to max', () => {
            controller.setHP(80);
            controller.heal(24, 96);
            expect(controller.getHP()).toBe(96);
        });

        it('heal does not exceed max HP', () => {
            controller.setHP(90);
            controller.heal(24, 96);
            expect(controller.getHP()).toBe(96);
        });
    });

    describe('facing', () => {
        it('getFacing returns current facing', () => {
            controller.facing = 'up';
            expect(controller.getFacing()).toBe('up');
        });
    });

    describe('touch controls', () => {
        it('setTouchDir updates touch direction', () => {
            controller.setTouchDir(1, 0);
            expect(controller.touchDir.x).toBe(1);
            expect(controller.touchDir.y).toBe(0);
        });

        it('setTouchAttack sets touch attack flag', () => {
            controller.setTouchAttack(true);
            expect(controller.touchAttack).toBe(true);
        });

        it('consumeTouchAttack returns and clears touch attack', () => {
            controller.setTouchAttack(true);
            const result = controller.consumeTouchAttack();
            expect(result).toBe(true);
            expect(controller.touchAttack).toBe(false);
        });
    });

    describe('animation helpers', () => {
        it('playIdle plays idle animation for current facing', () => {
            controller.initInput();
            controller.createAnimations({ IDLE_N: 0, IDLE_S: 1, IDLE_E: 2, IDLE_W: 32 });
            controller.createPlayer(100, 100, 1);
            controller.facing = 'down';
            controller.playIdle();
            expect(controller.player.play).toHaveBeenCalledWith('idle_down', true);
        });

        it('playAttack plays attack animation for current facing', () => {
            controller.initInput();
            controller.createAnimations({ ATK_N: 64, ATK_S: 33, ATK_E: 3, ATK_W: 35 });
            controller.createPlayer(100, 100, 1);
            controller.facing = 'right';
            controller.playAttack();
            expect(controller.player.play).toHaveBeenCalledWith('attack_right', true);
        });
    });

    describe('stop', () => {
        it('stops player velocity', () => {
            controller.initInput();
            controller.createAnimations({ IDLE_S: 1 });
            controller.createPlayer(100, 100, 1);
            controller.stop();
            expect(controller.player.setVelocity).toHaveBeenCalledWith(0, 0);
        });
    });

    describe('getPosition', () => {
        it('returns player position', () => {
            controller.initInput();
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

    describe('callbacks', () => {
        it('onDamage callback is called when player takes damage', () => {
            const onDamageSpy = vi.fn();
            controller.onDamage = onDamageSpy;
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
            
            expect(onDamageSpy).toHaveBeenCalled();
        });

        it('onDeath callback is called when HP reaches 0', () => {
            const onDeathSpy = vi.fn();
            controller.onDeath = onDeathSpy;
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
            
            expect(onDeathSpy).toHaveBeenCalled();
        });
    });
});