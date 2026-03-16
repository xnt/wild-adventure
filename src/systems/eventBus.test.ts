// Tests for systems/eventBus.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from './eventBus.js';

describe('systems/eventBus.ts', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = new EventBus();
    });

    describe('on', () => {
        it('subscribes to an event and receives payload', () => {
            const handler = vi.fn();
            eventBus.on('player:died', handler);

            eventBus.emit('player:died', undefined);

            expect(handler).toHaveBeenCalledWith(undefined);
        });

        it('allows multiple handlers for same event', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            eventBus.on('enemy:killed', handler1);
            eventBus.on('enemy:killed', handler2);

            eventBus.emit('enemy:killed', { enemy: { type: 'goblin' } as any });

            expect(handler1).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
        });

        it('returns unsubscribe function', () => {
            const handler = vi.fn();
            const unsubscribe = eventBus.on('combat:attackStarted', handler);

            unsubscribe();
            eventBus.emit('combat:attackStarted', undefined);

            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('once', () => {
        it('subscribes to an event for one-time only', () => {
            const handler = vi.fn();
            eventBus.once('collectible:triforceComplete', handler);

            eventBus.emit('collectible:triforceComplete', undefined);
            eventBus.emit('collectible:triforceComplete', undefined);

            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    describe('emit', () => {
        it('calls handlers with correct payload', () => {
            const handler = vi.fn();
            eventBus.on('combat:enemyHit', handler);

            const mockEnemy = { type: 'goblin', hp: 3 } as any;
            eventBus.emit('combat:enemyHit', { enemy: mockEnemy });

            expect(handler).toHaveBeenCalledWith({ enemy: mockEnemy });
        });

        it('does nothing when no handlers registered', () => {
            // Should not throw
            expect(() => {
                eventBus.emit('player:damaged', { hp: 50, maxHp: 100 });
            }).not.toThrow();
        });
    });

    describe('off', () => {
        it('removes all handlers for a specific event', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            eventBus.on('enemy:killed', handler1);
            eventBus.on('enemy:killed', handler2);

            eventBus.off('enemy:killed');
            eventBus.emit('enemy:killed', { enemy: {} as any });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });

        it('removes all handlers when called without argument', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            eventBus.on('player:died', handler1);
            eventBus.on('game:victory', handler2);

            eventBus.off();
            eventBus.emit('player:died', undefined);
            eventBus.emit('game:victory', undefined);

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
    });

    describe('type safety', () => {
        it('enforces correct payload types at compile time', () => {
            // These should compile without errors
            eventBus.on('player:died', () => {});
            eventBus.on('player:damaged', ({ hp, maxHp }) => {
                expect(typeof hp).toBe('number');
                expect(typeof maxHp).toBe('number');
            });
            eventBus.on('collectible:triforceCollected', ({ pieceIndex }) => {
                expect(typeof pieceIndex).toBe('number');
            });

            // Trigger the events
            eventBus.emit('player:died', undefined);
            eventBus.emit('player:damaged', { hp: 50, maxHp: 100 });
            eventBus.emit('collectible:triforceCollected', { pieceIndex: 1 });
        });
    });
});
