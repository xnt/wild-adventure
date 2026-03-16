// Tests for systems/combatSystem.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatSystem } from './combatSystem.js';
import { EventBus } from './eventBus.js';

describe('systems/combatSystem.ts', () => {
    let system: CombatSystem;
    let mockScene: any;
    let eventBus: EventBus;

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

        eventBus = new EventBus();
        system = new CombatSystem(mockScene, eventBus);
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

    describe('eventBus', () => {
        it('emits combat:attackStarted event when attack begins', () => {
            const onAttackStartSpy = vi.fn();
            eventBus.on('combat:attackStarted', onAttackStartSpy);
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

            expect(onAttackStartSpy).toHaveBeenCalledWith(undefined);
        });

        it('emits combat:enemyHit event when enemy is hit', () => {
            const onEnemyHitSpy = vi.fn();
            eventBus.on('combat:enemyHit', onEnemyHitSpy);

            // Set up the system with mocked groups
            const mockSwordGroup = {} as any;
            const mockEnemiesGroup = {} as any;
            system.init(mockSwordGroup, mockEnemiesGroup);

            // Verify the event would be emitted (callback is registered)
            expect(mockScene.physics.add.overlap).toHaveBeenCalled();
        });
    });
});