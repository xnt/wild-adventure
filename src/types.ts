// Shared types for GameScene and utils (extracted for DRY/no-circular imports).
// Phaser-augmented entities, callbacks, positioned objs.
// (Centralized for testability/iteration; keeps GameScene thinner.)

import Phaser from 'phaser';

/** Touch dir for mobile fallback. */
export interface TouchDir {
    x: number;
    y: number;
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
};

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