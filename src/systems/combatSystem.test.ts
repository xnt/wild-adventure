// Tests for systems/combatSystem.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatSystem } from './combatSystem.js';

describe('systems/combatSystem.ts', () => {
    let system: CombatSystem;
    let mockScene: any;

    beforeEach(() => {
        mockScene = {
            physics: {
                add: {
                    existing: vi.fn().mockReturnThis(),
                    group: vi.fn().mockReturnValue({
                        add: vi.fn(),
                    }),
                    overlap: vi.fn(),
                },
            },
            add: {
                rectangle: vi.fn().mockReturnValue({
                    setDepth: vi.fn().mockReturnThis(),
                }),
            },
            time: {
                delayedCall: vi.fn(),
            },
        };

        system = new CombatSystem(mockScene);
    });

    describe('createSwordGroup', () => {
        it('creates a physics group for swords', () => {
            const group = system.createSwordGroup();
            expect(mockScene.physics.add.group).toHaveBeenCalled();
            expect(group).toBeDefined();
        });
    });

    describe('init', () => {
        it('sets up sword vs enemy overlap', () => {
            const mockSwordGroup = {} as any;
            const mockEnemiesGroup = {} as any;
            
            system.init(mockSwordGroup, mockEnemiesGroup);
            
            expect(mockScene.physics.add.overlap).toHaveBeenCalled;
            expect(system.swordGroup).toBe(mockSwordGroup);
            expect(system.enemiesGroup).toBe(mockEnemiesGroup);
        });
    });

    describe('update', () => {
        it('does not attack when justPressed is false', () => {
            system.isAttacking = false;
            system.lastAttackTime = 0;
            
            const result = system.update(1000, 100, 100, 'down', false);
            
            expect(result).toBe(false);
        });

        it('does not attack when already attacking', () => {
            system.isAttacking = true;
            
            const result = system.update(1000, 100, 100, 'down', true);
            
            expect(result).toBe(false);
        });
    });

    describe('getIsAttacking', () => {
        it('returns current attacking state', () => {
            system.isAttacking = true;
            expect(system.getIsAttacking()).toBe(true);
            
            system.isAttacking = false;
            expect(system.getIsAttacking()).toBe(false);
        });
    });

    describe('setAttacking', () => {
        it('sets attacking state', () => {
            system.setAttacking(true);
            expect(system.isAttacking).toBe(true);
            
            system.setAttacking(false);
            expect(system.isAttacking).toBe(false);
        });
    });

    describe('callbacks', () => {
        it('onAttackStart is called when attack begins', () => {
            const onAttackStartSpy = vi.fn();
            system.onAttackStart = onAttackStartSpy;
            system.isAttacking = false;
            system.lastAttackTime = 0;
            
            // Initialize swordGroup before attack
            const mockSwordGroup = { add: vi.fn() };
            system.swordGroup = mockSwordGroup as any;
            
            // Mock the scene methods needed for executeAttack
            mockScene.add.rectangle = vi.fn().mockReturnValue({
                setDepth: vi.fn().mockReturnThis(),
            });
            mockScene.physics.add.existing = vi.fn();
            mockScene.time.delayedCall = vi.fn((_, cb) => cb());
            mockScene.tweens = { add: vi.fn() };
            
            system.update(2000, 100, 100, 'down', true);
            
            expect(onAttackStartSpy).toHaveBeenCalled();
        });

        it('onEnemyHit callback can be set', () => {
            const onEnemyHitSpy = vi.fn();
            system.onEnemyHit = onEnemyHitSpy;
            expect(system.onEnemyHit).toBe(onEnemyHitSpy);
        });
    });
});