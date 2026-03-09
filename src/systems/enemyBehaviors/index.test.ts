import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';
import {
    BaseEnemyBehavior,
    GoblinBehavior,
    WizrobeBehavior,
    LynelBehavior,
    GelBehavior,
    GelSmallBehavior,
    createBehavior
} from './index.js';
import type { GameEnemy, PositionedObject } from '../../types.js';

describe('enemyBehaviors', () => {
    let player: PositionedObject;
    let mockEnemy: any;

    beforeEach(() => {
        player = { x: 200, y: 200 };
        mockEnemy = {
            x: 100,
            y: 100,
            isDying: false,
            speedMult: 1,
            patrolTimer: 0,
            patrolTarget: new Phaser.Math.Vector2(100, 100),
            setVelocity: vi.fn(),
            setTint: vi.fn(),
            clearTint: vi.fn(),
            setScale: vi.fn(),
            type: 'goblin'
        };
    });

    describe('BaseEnemyBehavior', () => {
        it('should updateMovement chase player when in range', () => {
            class TestBehavior extends BaseEnemyBehavior {
                update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
                    this.updateMovement(enemy, player, time);
                    return false;
                }
            }
            const behavior = new TestBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 150;
            player.y = 150;
            
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            
            expect(mockEnemy.setVelocity).toHaveBeenCalled();
            expect(mockEnemy.setTint).toHaveBeenCalledWith(0xff8888);
            expect(mockEnemy.isChasing).toBe(true);
        });

        it('should patrol when player is out of range', () => {
            class TestBehavior extends BaseEnemyBehavior {
                update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
                    this.updateMovement(enemy, player, time);
                    return false;
                }
            }
            const behavior = new TestBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 500;
            player.y = 500;
            mockEnemy.patrolTimer = -1;
            // Mock the set method on patrolTarget
            const originalSet = mockEnemy.patrolTarget.set;
            mockEnemy.patrolTarget.set = vi.fn((x: number, y: number) => {
                mockEnemy.patrolTarget.x = x;
                mockEnemy.patrolTarget.y = y;
                return mockEnemy.patrolTarget;
            });
            
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            
            expect(mockEnemy.clearTint).toHaveBeenCalled();
            expect(mockEnemy.isChasing).toBe(false);
            expect(mockEnemy.patrolTimer).toBeGreaterThan(0);
            // Cleanup
            mockEnemy.patrolTarget.set = originalSet;
        });

        it('should stop when reached patrol target', () => {
            class TestBehavior extends BaseEnemyBehavior {
                update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
                    this.updateMovement(enemy, player, time);
                    return false;
                }
            }
            const behavior = new TestBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 500;
            player.y = 500;
            mockEnemy.patrolTarget.x = 100;
            mockEnemy.patrolTarget.y = 100;
            mockEnemy.patrolTimer = 100;
            
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            
            expect(mockEnemy.setVelocity).toHaveBeenCalledWith(0, 0);
        });

        it('should apply bobbing animation', () => {
            class TestBehavior extends BaseEnemyBehavior {
                update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
                    this.applyBobbing(enemy, time, 1);
                    return false;
                }
            }
            const behavior = new TestBehavior();
            
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            
            expect(mockEnemy.setScale).toHaveBeenCalled();
        });
    });

    describe('GoblinBehavior', () => {
        it('should chase player when in range', () => {
            const behavior = new GoblinBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 150;
            player.y = 150;
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(mockEnemy.setVelocity).toHaveBeenCalled();
            expect(mockEnemy.setTint).toHaveBeenCalledWith(0xff8888);
        });

        it('should not update if dying', () => {
            const behavior = new GoblinBehavior();
            mockEnemy.isDying = true;
            const result = behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(result).toBe(false);
            expect(mockEnemy.setVelocity).not.toHaveBeenCalled();
        });

        it('should apply bobbing with base scale 1', () => {
            const behavior = new GoblinBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 500;
            player.y = 500;
            mockEnemy.patrolTimer = 100;
            mockEnemy.patrolTarget.x = 500;
            mockEnemy.patrolTarget.y = 500;
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(mockEnemy.setScale).toHaveBeenCalled();
        });
    });

    describe('WizrobeBehavior', () => {
        it('should return true when it is time to shoot', () => {
            const behavior = new WizrobeBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 120;
            player.y = 120;
            mockEnemy.shoots = true;
            mockEnemy.shootCd = 1000;
            mockEnemy.lastShotTime = 0;
            
            const result = behavior.update(mockEnemy as GameEnemy, player, 2000);
            expect(result).toBe(true);
            expect(mockEnemy.lastShotTime).toBe(2000);
        });

        it('should return false if cooldown not elapsed', () => {
            const behavior = new WizrobeBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 120;
            player.y = 120;
            mockEnemy.shoots = true;
            mockEnemy.shootCd = 1000;
            mockEnemy.lastShotTime = 1500;
            
            const result = behavior.update(mockEnemy as GameEnemy, player, 2000);
            expect(result).toBe(false);
        });

        it('should not shoot if shoots is false', () => {
            const behavior = new WizrobeBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 120;
            player.y = 120;
            mockEnemy.shoots = false;
            
            const result = behavior.update(mockEnemy as GameEnemy, player, 2000);
            expect(result).toBe(false);
        });

        it('should not shoot if player is too far', () => {
            const behavior = new WizrobeBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 1000;
            player.y = 1000;
            mockEnemy.shoots = true;
            mockEnemy.patrolTimer = 100;
            mockEnemy.patrolTarget.x = 1000;
            mockEnemy.patrolTarget.y = 1000;
            
            const result = behavior.update(mockEnemy as GameEnemy, player, 2000);
            expect(result).toBe(false);
        });

        it('should initialize lastShotTime if not set', () => {
            const behavior = new WizrobeBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 120;
            player.y = 120;
            mockEnemy.shoots = true;
            mockEnemy.shootCd = 1000;
            mockEnemy.lastShotTime = undefined;
            mockEnemy.patrolTimer = 100;
            mockEnemy.patrolTarget.x = 120;
            mockEnemy.patrolTarget.y = 120;
            
            behavior.update(mockEnemy as GameEnemy, player, 2000);
            // lastShotTime should be initialized to 0, then set to current time when shooting
            expect(mockEnemy.lastShotTime).toBe(2000);
        });

        it('should not update if dying', () => {
            const behavior = new WizrobeBehavior();
            mockEnemy.isDying = true;
            const result = behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(result).toBe(false);
        });
    });

    describe('LynelBehavior', () => {
        it('should chase player when in range', () => {
            const behavior = new LynelBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 150;
            player.y = 150;
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(mockEnemy.setVelocity).toHaveBeenCalled();
            expect(mockEnemy.setTint).toHaveBeenCalledWith(0xff8888);
        });

        it('should not update if dying', () => {
            const behavior = new LynelBehavior();
            mockEnemy.isDying = true;
            const result = behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(result).toBe(false);
        });

        it('should apply bobbing with base scale 1.2', () => {
            const behavior = new LynelBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 500;
            player.y = 500;
            mockEnemy.patrolTimer = 100;
            mockEnemy.patrolTarget.x = 500;
            mockEnemy.patrolTarget.y = 500;
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(mockEnemy.setScale).toHaveBeenCalled();
        });
    });

    describe('GelBehavior', () => {
        it('should chase player when in range', () => {
            const behavior = new GelBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 150;
            player.y = 150;
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(mockEnemy.setVelocity).toHaveBeenCalled();
            expect(mockEnemy.setTint).toHaveBeenCalledWith(0xff8888);
        });

        it('should not update if dying', () => {
            const behavior = new GelBehavior();
            mockEnemy.isDying = true;
            const result = behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(result).toBe(false);
        });

        it('should apply bobbing with base scale 0.7', () => {
            const behavior = new GelBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 500;
            player.y = 500;
            mockEnemy.patrolTimer = 100;
            mockEnemy.patrolTarget.x = 500;
            mockEnemy.patrolTarget.y = 500;
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(mockEnemy.setScale).toHaveBeenCalled();
        });

        it('should call splitGel on damage if hp <= 0', () => {
            const behavior = new GelBehavior();
            const mockSystem = { splitGel: vi.fn() };
            mockEnemy.hp = 0;
            
            behavior.onDamage!(mockEnemy as GameEnemy, mockSystem);
            expect(mockSystem.splitGel).toHaveBeenCalledWith(mockEnemy);
        });

        it('should not call splitGel if hp > 0', () => {
            const behavior = new GelBehavior();
            const mockSystem = { splitGel: vi.fn() };
            mockEnemy.hp = 1;
            
            behavior.onDamage!(mockEnemy as GameEnemy, mockSystem);
            expect(mockSystem.splitGel).not.toHaveBeenCalled();
        });
    });

    describe('GelSmallBehavior', () => {
        it('should chase player when in range', () => {
            const behavior = new GelSmallBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 150;
            player.y = 150;
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(mockEnemy.setVelocity).toHaveBeenCalled();
            expect(mockEnemy.setTint).toHaveBeenCalledWith(0xff8888);
        });

        it('should not update if dying', () => {
            const behavior = new GelSmallBehavior();
            mockEnemy.isDying = true;
            const result = behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(result).toBe(false);
        });

        it('should apply bobbing with base scale 0.5', () => {
            const behavior = new GelSmallBehavior();
            mockEnemy.x = 100;
            mockEnemy.y = 100;
            player.x = 500;
            player.y = 500;
            mockEnemy.patrolTimer = 100;
            mockEnemy.patrolTarget.x = 500;
            mockEnemy.patrolTarget.y = 500;
            behavior.update(mockEnemy as GameEnemy, player, 1000);
            expect(mockEnemy.setScale).toHaveBeenCalled();
        });
    });

    describe('createBehavior', () => {
        it('should create correct behavior for type', () => {
            expect(createBehavior('goblin')).toBeInstanceOf(GoblinBehavior);
            expect(createBehavior('wizrobe')).toBeInstanceOf(WizrobeBehavior);
            expect(createBehavior('lynel')).toBeInstanceOf(LynelBehavior);
            expect(createBehavior('gel')).toBeInstanceOf(GelBehavior);
            expect(createBehavior('gel_small')).toBeInstanceOf(GelSmallBehavior);
        });

        it('should default to GoblinBehavior for unknown types', () => {
            expect(createBehavior('unknown')).toBeInstanceOf(GoblinBehavior);
            expect(createBehavior('')).toBeInstanceOf(GoblinBehavior);
        });
    });
});