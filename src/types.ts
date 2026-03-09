// Shared types for GameScene and utils (extracted for DRY/no-circular imports).
// Phaser-augmented entities, callbacks, positioned objs.
// (Centralized for testability/iteration; keeps GameScene thinner.)

import Phaser from 'phaser';

/** Touch dir for mobile fallback. */
export interface TouchDir {
    x: number;
    y: number;
}

// --- Device-Agnostic Input System Types ---

/**
 * PlayerIntent represents the player's intended actions,
 * abstracted away from specific input devices.
 * This is the unified "input contract" that game systems consume.
 */
export interface PlayerIntent {
    /** Normalized movement direction (-1 to 1 for each axis) */
    moveX: number;
    moveY: number;
    /** Whether the player wants to attack */
    attack: boolean;
}

/**
 * InputSource is the interface for any device-specific input provider.
 * Keyboard, touch, gamepad, etc. all implement this interface.
 */
export interface InputSource {
    /** Returns the current player intent based on device state */
    getIntent(): PlayerIntent;
    /** Called each frame to update internal state (e.g., consume one-shot events) */
    update(): void;
    /** Clean up event listeners, etc. */
    destroy(): void;
}

/** Intersection for augmented Phaser enemy sprites (custom props like hp/type). */
export type GameEnemy = Phaser.Physics.Arcade.Sprite & {
    type: string;
    hp: number;
    speedMult?: number;
    shoots?: boolean;
    projSpeed?: number;
    shootCd?: number;
    lastShotTime?: number;
    patrolTarget: Phaser.Math.Vector2;
    patrolTimer: number;
    isChasing: boolean;
    isDying?: boolean;
    behavior?: EnemyBehavior;
};

/**
 * Strategy interface for enemy behavior.
 */
export interface EnemyBehavior {
    update(enemy: GameEnemy, player: PositionedObject, time: number): boolean;
    onDamage?(enemy: GameEnemy, enemySystem: any): void;
}

/** Union for physics callbacks (exact match to ArcadePhysicsCallback for assignability). */
export type PhysicsCallbackObject =
    | Phaser.Types.Physics.Arcade.GameObjectWithBody
    | Phaser.Physics.Arcade.Body
    | Phaser.Physics.Arcade.StaticBody
    | Phaser.Tilemaps.Tile;

/** Structural type for objects with position (x/y; simplifies damage/knockback). */
export type PositionedObject = { x: number; y: number };

/** Cardinal facing direction (snapped from velocity/input; used in anim/attack calcs). */
export type Facing = 'up' | 'down' | 'left' | 'right';

// --- Unified Collectible System Types ---

export type CollectibleType = 'heart' | 'triforce_piece' | 'compass' | 'key' | 'potion';

export interface CollectibleDefinition {
    type: CollectibleType;
    texture: string;
    label: string;
    onPickup?: (scene: any, collectible: GameCollectible) => void;
}

/** 
 * Instance of a collectible in the world.
 */
export type GameCollectible = Phaser.Physics.Arcade.Sprite & {
    collectibleType: CollectibleType;
    data?: any;
};

// Re-export EnemyConfig and ChestContent from constants for convenience.
export type { EnemyConfig, ChestContent } from './constants.js';

/**
 * Intersection type for chest sprites placed in the world.
 * `content` is intentionally generic (ChestContent) so chests can hold
 * different item types in the future (potions, keys, etc.).
 */
import type { ChestContent as _ChestContent } from './constants.js';
export type GameChest = Phaser.Physics.Arcade.Sprite & {
    opened: boolean;
    chestIndex: number;        // position in CHEST_CONTENTS array
    content: _ChestContent;    // what this chest holds
};