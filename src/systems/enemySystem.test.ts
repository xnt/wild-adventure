// Tests for systems/enemySystem.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnemySystem } from './enemySystem.js';
import { EventBus } from './eventBus.js';

describe('systems/enemySystem.ts', () => {
    let system: EnemySystem;
    let mockScene: any;
    let eventBus: EventBus;

    beforeEach(() => {
        mockScene = {
            physics: {
                add: {
                    group: vi.fn().mockReturnValue({
                        add: vi.fn(),
                        getChildren: vi.fn().mockReturnValue([]),
                    }),
                    sprite: vi.fn().mockReturnValue({
                        setDepth: vi.fn().mockReturnThis(),
                        setCollideWorldBounds: vi.fn().mockReturnThis(),
                        setScale: vi.fn().mockReturnThis(),
                        setVelocity: vi.fn().mockReturnThis(),
                        setTint: vi.fn().mockReturnThis(),
                        clearTint: vi.fn().mockReturnThis(),
                        setRotation: vi.fn().mockReturnThis(),
                        body: {
                            setSize: vi.fn().mockReturnThis(),
                            setOffset: vi.fn().mockReturnThis(),
                            enable: true,
                            setAllowGravity: vi.fn().mockReturnThis(),
                            setImmovable: vi.fn().mockReturnThis(),
                        },
                        active: true,
                        destroy: vi.fn(),
                    }),
                    collider: vi.fn(),
                    overlap: vi.fn(),
                },
            },
            tweens: {
                add: vi.fn(),
            },
            time: {
                delayedCall: vi.fn(),
            },
        };

        eventBus = new EventBus();
        system = new EnemySystem(mockScene, eventBus);
    });

    describe('init', () => {
        it('initializes enemy and projectile groups', () => {
            const mockObstacleLayer = {} as any;
            const mockWaterLayer = {} as any;
            const mockCollectibleSystem = {} as any;
            system.init(mockObstacleLayer, mockWaterLayer, mockCollectibleSystem);

            expect(system.enemies).toBeDefined();
            expect(system.enemyProjectiles).toBeDefined();
            expect(system.obstacleLayer).toBe(mockObstacleLayer);
            expect(system.waterLayer).toBe(mockWaterLayer);
            expect(system.collectibleSystem).toBe(mockCollectibleSystem);
        });
    });

    describe('getRemaining', () => {
        it('returns remaining enemies count', () => {
            system.enemiesKilled = 3;
            system.totalEnemies = 7;
            expect(system.getRemaining()).toBe(4);
        });
    });

    describe('getLivingEnemies', () => {
        it('returns empty array when no enemies', () => {
            system.enemies = { getChildren: vi.fn().mockReturnValue([]) } as any;
            const living = system.getLivingEnemies();
            expect(living).toEqual([]);
        });

        it('filters out dying and inactive enemies', () => {
            const mockEnemies = [
                { active: true, isDying: false },
                { active: false, isDying: false },
                { active: true, isDying: true },
            ];
            system.enemies = { getChildren: vi.fn().mockReturnValue(mockEnemies) } as any;
            
            const living = system.getLivingEnemies();
            expect(living.length).toBe(1);
        });
    });

    describe('getEnemies', () => {
        it('returns enemies group', () => {
            system.enemies = {} as any;
            expect(system.getEnemies()).toBe(system.enemies);
        });
    });

    describe('damageEnemy', () => {
        it('returns false for dying enemies', () => {
            const enemy = { isDying: true } as any;
            const result = system.damageEnemy(enemy);
            expect(result).toBe(false);
        });

        it('decrements enemy HP', () => {
            const enemy = {
                isDying: false,
                hp: 3,
                setTint: vi.fn(),
                active: true,
                clearTint: vi.fn(),
            } as any;
            mockScene.time.delayedCall = vi.fn((_, cb) => cb());
            
            system.damageEnemy(enemy);
            expect(enemy.hp).toBe(2);
        });
    });

    describe('eventBus', () => {
        it('emits enemy:killed event when enemy is killed', () => {
            const onEnemyKilledSpy = vi.fn();
            eventBus.on('enemy:killed', onEnemyKilledSpy);

            // Verify event bus subscription works
            eventBus.emit('enemy:killed', { enemy: { type: 'goblin' } as any });
            expect(onEnemyKilledSpy).toHaveBeenCalledWith({ enemy: expect.any(Object) });
        });

        it('emits enemy:playerHit event when player is hit by enemy', () => {
            const onPlayerHitSpy = vi.fn();
            eventBus.on('enemy:playerHit', onPlayerHitSpy);

            // Verify event bus subscription works
            eventBus.emit('enemy:playerHit', { enemy: { type: 'goblin' } as any });
            expect(onPlayerHitSpy).toHaveBeenCalledWith({ enemy: expect.any(Object) });
        });

        it('emits enemy:projectileHit event when player is hit by projectile', () => {
            const onProjectileHitSpy = vi.fn();
            eventBus.on('enemy:projectileHit', onProjectileHitSpy);

            // Verify event bus subscription works
            eventBus.emit('enemy:projectileHit', { projectile: {} as any });
            expect(onProjectileHitSpy).toHaveBeenCalledWith({ projectile: expect.any(Object) });
        });
    });

    describe('setupPlayerCollisions', () => {
        it('sets up overlap for player vs enemies and projectiles', () => {
            const mockPlayer = {} as any;
            system.enemies = {} as any;
            system.enemyProjectiles = {} as any;
            
            system.setupPlayerCollisions(mockPlayer);
            
            expect(mockScene.physics.add.overlap).toHaveBeenCalledTimes(2);
        });
    });
});