import type { GameEnemy } from '../types.js';

// ============================================================================
// Event Bus — typed pub/sub for decoupled system communication
// ============================================================================

/** All game events and their payloads */
export interface GameEvents {
    // Player events
    'player:died': undefined;
    'player:damaged': { hp: number; maxHp: number };

    // Combat events
    'combat:attackStarted': undefined;
    'combat:attackEnded': undefined;
    'combat:enemyHit': { enemy: GameEnemy };

    // Enemy events
    'enemy:killed': { enemy: GameEnemy };
    'enemy:playerHit': { enemy: GameEnemy };
    'enemy:projectileHit': { projectile: Phaser.Physics.Arcade.Sprite };

    // Collectible events
    'collectible:triforceCollected': { pieceIndex: number };
    'collectible:triforceComplete': undefined;
    'collectible:compassCollected': undefined;
    'collectible:snorkelCollected': undefined;
    'collectible:heartCollected': undefined;
    'collectible:chestOpened': { label: string };

    // Game state events
    'game:victory': undefined;
    'game:gameOver': undefined;
}

/** Event name type */
export type EventName = keyof GameEvents;

/** Handler type for a specific event */
export type EventHandler<T extends EventName> = (payload: GameEvents[T]) => void;

/**
 * Typed event bus for decoupled system communication.
 * Systems emit events; other systems subscribe to them.
 * All events are processed synchronously (no race conditions).
 */
export class EventBus {
    private listeners: {
        [K in EventName]?: Set<EventHandler<K>>;
    } = {};

    /**
     * Subscribe to an event.
     * @returns Unsubscribe function
     */
    on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
        if (!this.listeners[event]) {
            (this.listeners as any)[event] = new Set<EventHandler<T>>();
        }
        this.listeners[event]!.add(handler);

        // Return unsubscribe function
        return () => {
            this.listeners[event]!.delete(handler);
        };
    }

    /**
     * Subscribe to an event for one-time only.
     */
    once<T extends EventName>(event: T, handler: EventHandler<T>): void {
        const unsubscribe = this.on(event, (payload) => {
            unsubscribe();
            handler(payload);
        });
    }

    /**
     * Emit an event to all subscribers.
     * Handlers are called synchronously in subscription order.
     */
    emit<T extends EventName>(event: T, payload: GameEvents[T]): void {
        const handlers = this.listeners[event];
        if (!handlers) return;

        for (const handler of handlers) {
            handler(payload);
        }
    }

    /**
     * Remove all listeners for an event, or all listeners entirely.
     */
    off<T extends EventName>(event?: T): void {
        if (event) {
            delete this.listeners[event];
        } else {
            this.listeners = {};
        }
    }
}
