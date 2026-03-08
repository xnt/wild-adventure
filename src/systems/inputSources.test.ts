import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';
import { KeyboardInputSource, TouchInputSource, CompositeInputSource } from './inputSources.js';
import type { PlayerIntent } from '../types.js';

describe('systems/inputSources.ts', () => {
    describe('KeyboardInputSource', () => {
        let source: KeyboardInputSource;
        let mockScene: any;

        beforeEach(() => {
            mockScene = {
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
            };

            source = new KeyboardInputSource(mockScene);
        });

        it('returns zero intent when no keys pressed', () => {
            const intent = source.getIntent();
            expect(intent.moveX).toBe(0);
            expect(intent.moveY).toBe(0);
            expect(intent.attack).toBe(false);
        });

        it('returns movement intent for cursor keys', () => {
            // Simulate cursor keys being down
            source['cursors'].left.isDown = true;
            source['cursors'].up.isDown = true;

            const intent = source.getIntent();
            expect(intent.moveX).toBe(-1);
            expect(intent.moveY).toBe(-1);
        });

        it('returns movement intent for WASD keys', () => {
            source['wasd'].right.isDown = true;
            source['wasd'].down.isDown = true;

            const intent = source.getIntent();
            expect(intent.moveX).toBe(1);
            expect(intent.moveY).toBe(1);
        });

        it('returns attack intent after update when space just pressed', () => {
            // Mock JustDown to return true
            vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true);
            
            source.update();
            const intent = source.getIntent();
            
            expect(intent.attack).toBe(true);
        });

        it('destroy does not throw', () => {
            expect(() => source.destroy()).not.toThrow();
        });
    });

    describe('TouchInputSource', () => {
        let source: TouchInputSource;
        let mockScene: any;

        beforeEach(() => {
            mockScene = {
                input: {
                    on: vi.fn(),
                    off: vi.fn(),
                },
                scale: { width: 800 },
            };

            source = new TouchInputSource(mockScene);
        });

        it('returns zero intent initially', () => {
            const intent = source.getIntent();
            expect(intent.moveX).toBe(0);
            expect(intent.moveY).toBe(0);
            expect(intent.attack).toBe(false);
        });

        it('sets attack intent when touching right side of screen', () => {
            // Simulate touch in attack zone (right 30%)
            // Call the private method directly with bound context
            (source as any).onPointerDown({ x: 700, y: 400 });
            
            const intent = source.getIntent();
            expect(intent.attack).toBe(true);
        });

        it('does not set attack intent when touching left side', () => {
            // Touch in movement zone (left 70%)
            (source as any).onPointerDown({ x: 100, y: 400 });
            
            const intent = source.getIntent();
            expect(intent.attack).toBe(false);
        });

        it('sets movement intent when dragging in movement zone', () => {
            // Move finger in movement zone
            const pointer = {
                x: 200,
                y: 200,
                isDown: true,
                downX: 100,
                downY: 200,
            };
            
            (source as any).onPointerMove(pointer);
            
            const intent = source.getIntent();
            expect(intent.moveX).toBeCloseTo(1, 1);
            expect(intent.moveY).toBeCloseTo(0, 1);
        });

        it('clears intent on pointer up', () => {
            // Set some state
            (source as any).onPointerDown({ x: 700, y: 400 });
            
            // Release
            (source as any).onPointerUp();
            
            const intent = source.getIntent();
            expect(intent.moveX).toBe(0);
            expect(intent.moveY).toBe(0);
            expect(intent.attack).toBe(false);
        });

        it('consumes attack after update', () => {
            (source as any).onPointerDown({ x: 700, y: 400 });
            
            // First update consumes the attack
            source.update();
            expect(source.getIntent().attack).toBe(false);
        });

        it('destroy removes event listeners', () => {
            source.destroy();
            expect(mockScene.input.off).toHaveBeenCalledTimes(3);
        });
    });

    describe('CompositeInputSource', () => {
        it('combines movement from multiple sources', () => {
            const source1 = {
                getIntent: () => ({ moveX: 1, moveY: 0, attack: false }),
                update: vi.fn(),
                destroy: vi.fn(),
            };
            const source2 = {
                getIntent: () => ({ moveX: 0, moveY: 1, attack: false }),
                update: vi.fn(),
                destroy: vi.fn(),
            };

            const composite = new CompositeInputSource([source1 as any, source2 as any]);
            const intent = composite.getIntent();

            // Should be normalized diagonal
            expect(intent.moveX).toBeCloseTo(0.707, 2);
            expect(intent.moveY).toBeCloseTo(0.707, 2);
        });

        it('ORs attack from multiple sources', () => {
            const source1 = {
                getIntent: () => ({ moveX: 0, moveY: 0, attack: false }),
                update: vi.fn(),
                destroy: vi.fn(),
            };
            const source2 = {
                getIntent: () => ({ moveX: 0, moveY: 0, attack: true }),
                update: vi.fn(),
                destroy: vi.fn(),
            };

            const composite = new CompositeInputSource([source1 as any, source2 as any]);
            const intent = composite.getIntent();

            expect(intent.attack).toBe(true);
        });

        it('calls update on all sources', () => {
            const source1 = {
                getIntent: () => ({ moveX: 0, moveY: 0, attack: false }),
                update: vi.fn(),
                destroy: vi.fn(),
            };
            const source2 = {
                getIntent: () => ({ moveX: 0, moveY: 0, attack: false }),
                update: vi.fn(),
                destroy: vi.fn(),
            };

            const composite = new CompositeInputSource([source1 as any, source2 as any]);
            composite.update();

            expect(source1.update).toHaveBeenCalled();
            expect(source2.update).toHaveBeenCalled();
        });

        it('calls destroy on all sources', () => {
            const source1 = {
                getIntent: () => ({ moveX: 0, moveY: 0, attack: false }),
                update: vi.fn(),
                destroy: vi.fn(),
            };
            const source2 = {
                getIntent: () => ({ moveX: 0, moveY: 0, attack: false }),
                update: vi.fn(),
                destroy: vi.fn(),
            };

            const composite = new CompositeInputSource([source1 as any, source2 as any]);
            composite.destroy();

            expect(source1.destroy).toHaveBeenCalled();
            expect(source2.destroy).toHaveBeenCalled();
        });
    });
});