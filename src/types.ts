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

// Re-export EnemyConfig from constants for convenience.
export type { EnemyConfig } from './constants.js';