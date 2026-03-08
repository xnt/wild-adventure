// Tests for systems/collectiblesSystem.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollectiblesSystem } from './collectiblesSystem.js';

describe('systems/collectiblesSystem.ts', () => {
    let system: CollectiblesSystem;
    let mockScene: any;

    beforeEach(() => {
        mockScene = {
            physics: {
                add: {
                    sprite: vi.fn().mockReturnValue({
                        setDepth: vi.fn().mockReturnThis(),
                        setImmovable: vi.fn().mockReturnThis(),
                        setTexture: vi.fn().mockReturnThis(),
                        destroy: vi.fn(),
                    }),
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
        };

        system = new CollectiblesSystem(mockScene);
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

        it('sets chest properties correctly', () => {
            const positions = [{ x: 100, y: 100 }];
            
            system.createChests(positions);
            
            expect(system.chests[0].opened).toBe(false);
            expect(system.chests[0].chestIndex).toBe(0);
        });
    });

    describe('getTriforcePieces', () => {
        it('returns current triforce piece count', () => {
            system.triforcePieces = 2;
            expect(system.getTriforcePieces()).toBe(2);
        });
    });

    describe('getHasCompass', () => {
        it('returns compass state', () => {
            system.hasCompass = true;
            expect(system.getHasCompass()).toBe(true);
            
            system.hasCompass = false;
            expect(system.getHasCompass()).toBe(false);
        });
    });

    describe('getChests', () => {
        it('returns chests array', () => {
            system.chests = [{ x: 100, y: 100 }] as any;
            expect(system.getChests()).toBe(system.chests);
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
            system.triforcePieces = 0;
            
            // Player is at 100, 100 - within CHEST_INTERACT_RANGE (40)
            system.update(100, 100);
            
            expect(mockChest.opened).toBe(true);
            expect(mockChest.setTexture).toHaveBeenCalledWith('chest_opened');
        });

        it('skips already opened chests', () => {
            const mockChest = {
                opened: true,
                x: 100,
                y: 100,
                setTexture: vi.fn(),
            };
            system.chests = [mockChest] as any;
            
            system.update(100, 100);
            
            expect(mockChest.setTexture).not.toHaveBeenCalled();
        });

        it('skips distant chests', () => {
            const mockChest = {
                opened: false,
                x: 100,
                y: 100,
                setTexture: vi.fn(),
            };
            system.chests = [mockChest] as any;
            
            // Player is far away
            system.update(500, 500);
            
            expect(mockChest.opened).toBe(false);
            expect(mockChest.setTexture).not.toHaveBeenCalled();
        });
    });

    describe('callbacks', () => {
        it('onTriforceCollected callback can be set', () => {
            const onTriforceCollectedSpy = vi.fn();
            system.onTriforceCollected = onTriforceCollectedSpy;
            expect(system.onTriforceCollected).toBe(onTriforceCollectedSpy);
        });

        it('onTriforceComplete callback can be set', () => {
            const onTriforceCompleteSpy = vi.fn();
            system.onTriforceComplete = onTriforceCompleteSpy;
            expect(system.onTriforceComplete).toBe(onTriforceCompleteSpy);
        });

        it('onCompassCollected callback can be set', () => {
            const onCompassCollectedSpy = vi.fn();
            system.onCompassCollected = onCompassCollectedSpy;
            expect(system.onCompassCollected).toBe(onCompassCollectedSpy);
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

    describe('collectTriforcePiece', () => {
        it('increments triforce pieces and triggers callback', () => {
            const onTriforceCollectedSpy = vi.fn();
            system.onTriforceCollected = onTriforceCollectedSpy;
            system.triforcePieces = 0;
            
            const mockChest = {
                x: 100,
                y: 100,
                content: { type: 'triforce_piece', label: 'Test Piece' },
            };
            
            system.collectTriforcePiece(mockChest as any);
            
            expect(system.triforcePieces).toBe(1);
            expect(onTriforceCollectedSpy).toHaveBeenCalledWith(1);
        });

        it('triggers onTriforceComplete when all pieces collected', () => {
            const onTriforceCompleteSpy = vi.fn();
            system.onTriforceComplete = onTriforceCompleteSpy;
            system.triforcePieces = 2;
            
            const mockChest = {
                x: 100,
                y: 100,
                content: { type: 'triforce_piece', label: 'Test Piece' },
            };
            
            system.collectTriforcePiece(mockChest as any);
            
            expect(onTriforceCompleteSpy).toHaveBeenCalled();
        });
    });

    describe('collectCompass', () => {
        it('sets hasCompass to true', () => {
            system.hasCompass = false;
            
            const mockChest = {
                x: 100,
                y: 100,
                content: { type: 'compass', label: 'Compass' },
            };
            
            system.collectCompass(mockChest as any);
            
            expect(system.hasCompass).toBe(true);
        });

        it('triggers onCompassCollected callback', () => {
            const onCompassCollectedSpy = vi.fn();
            system.onCompassCollected = onCompassCollectedSpy;
            
            const mockChest = {
                x: 100,
                y: 100,
                content: { type: 'compass', label: 'Compass' },
            };
            
            system.collectCompass(mockChest as any);
            
            expect(onCompassCollectedSpy).toHaveBeenCalled();
        });
    });
});