import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollectibleSystem } from './collectiblesSystem.js';
import { EventBus } from './eventBus.js';

describe('systems/collectiblesSystem.ts', () => {
    let system: CollectibleSystem;
    let mockScene: any;
    let eventBus: EventBus;

    beforeEach(() => {
        mockScene = {
            physics: {
                add: {
                    group: vi.fn().mockReturnValue({
                        create: vi.fn().mockReturnValue({
                            setDepth: vi.fn().mockReturnThis(),
                            setScale: vi.fn().mockReturnThis(),
                            destroy: vi.fn(),
                        }),
                        clear: vi.fn(),
                    }),
                    sprite: vi.fn().mockReturnValue({
                        setDepth: vi.fn().mockReturnThis(),
                        setImmovable: vi.fn().mockReturnThis(),
                        setTexture: vi.fn().mockReturnThis(),
                        destroy: vi.fn(),
                    }),
                    overlap: vi.fn(),
                },
            },
            add: {
                image: vi.fn().mockReturnValue({
                    setDepth: vi.fn().mockReturnThis(),
                    setScale: vi.fn().mockReturnThis(),
                    destroy: vi.fn(),
                }),
            },
            tweens: {
                add: vi.fn(),
            },
            cameras: {
                main: {
                    flash: vi.fn(),
                },
            },
            playerController: {
                heal: vi.fn(),
            }
        };

        eventBus = new EventBus();
        system = new CollectibleSystem(mockScene, eventBus);
    });

    describe('createChests', () => {
        it('creates chests at given positions', () => {
            const positions = [
                { x: 100, y: 100 },
                { x: 200, y: 200 },
            ];
            
            system.createChests(positions);
            
            expect(system.chests.length).toBe(2);
            expect(mockScene.physics.add.sprite).toHaveBeenCalledTimes(2);
        });
    });

    describe('spawnCollectible', () => {
        it('spawns a loose collectible of given type', () => {
            const collectible = system.spawnCollectible(100, 100, 'heart');
            expect(collectible).toBeDefined();
            expect(mockScene.physics.add.group().create).toHaveBeenCalled();
        });
    });

    describe('collect', () => {
        it('applies heart effect and heals player', () => {
            const mockCollectible = {
                collectibleType: 'heart',
                x: 100, y: 100,
                destroy: vi.fn(),
            };
            
            system.collect(mockCollectible as any);
            
            expect(mockScene.playerController.heal).toHaveBeenCalled();
            expect(mockCollectible.destroy).toHaveBeenCalled();
        });

        it('applies triforce piece effect', () => {
            const mockCollectible = {
                collectibleType: 'triforce_piece',
                x: 100, y: 100,
                destroy: vi.fn(),
            };
            
            system.collect(mockCollectible as any);
            
            expect(system.getTriforcePieces()).toBe(1);
            expect(mockScene.cameras.main.flash).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('opens nearby unopened chests', () => {
            const mockChest = {
                opened: false,
                x: 100,
                y: 100,
                setTexture: vi.fn(),
                content: { type: 'triforce_piece', label: 'Test' },
            };
            system.chests = [mockChest] as any;
            
            system.update(100, 100);
            
            expect(mockChest.opened).toBe(true);
            expect(mockChest.setTexture).toHaveBeenCalledWith('chest_opened');
        });
    });

    describe('reset', () => {
        it('resets system state', () => {
            system.triforcePieces = 3;
            system.hasCompass = true;
            system.chests = [{ active: true, destroy: vi.fn() }] as any;
            
            system.reset();
            
            expect(system.triforcePieces).toBe(0);
            expect(system.hasCompass).toBe(false);
            expect(system.chests).toEqual([]);
        });
    });
});