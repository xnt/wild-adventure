import Phaser from 'phaser';
import type { GameEnemy, PositionedObject, EnemyBehavior } from '../../types.js';
import {
    ENEMY_SPEED,
    CHASE_RANGE,
    TILE_SIZE,
    MAP_COLS,
    MAP_ROWS,
} from '../../constants.js';

/**
 * Base behavior with common movement/patrol logic.
 */
export abstract class BaseEnemyBehavior implements EnemyBehavior {
    abstract update(enemy: GameEnemy, player: PositionedObject, time: number): boolean;

    protected updateMovement(enemy: GameEnemy, player: PositionedObject, time: number): void {
        const dist = Phaser.Math.Distance.Between(
            enemy.x, enemy.y, player.x, player.y,
        );

        const speed = ENEMY_SPEED * (enemy.speedMult ?? 1);

        if (dist < CHASE_RANGE) {
            enemy.isChasing = true;
            const angle = Phaser.Math.Angle.Between(
                enemy.x, enemy.y, player.x, player.y,
            );
            enemy.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
            );
            enemy.setTint(0xff8888);
        } else {
            enemy.isChasing = false;
            enemy.clearTint();

            enemy.patrolTimer -= 16;
            if (enemy.patrolTimer <= 0) {
                enemy.patrolTimer = Phaser.Math.Between(2000, 4000);
                enemy.patrolTarget.set(
                    Phaser.Math.Clamp(enemy.x + Phaser.Math.Between(-80, 80), TILE_SIZE * 2, (MAP_COLS - 2) * TILE_SIZE),
                    Phaser.Math.Clamp(enemy.y + Phaser.Math.Between(-80, 80), TILE_SIZE * 2, (MAP_ROWS - 2) * TILE_SIZE),
                );
            }

            const pdist = Phaser.Math.Distance.Between(
                enemy.x, enemy.y, enemy.patrolTarget.x, enemy.patrolTarget.y,
            );
            if (pdist > 4) {
                const angle = Phaser.Math.Angle.Between(
                    enemy.x, enemy.y, enemy.patrolTarget.x, enemy.patrolTarget.y,
                );
                enemy.setVelocity(
                    Math.cos(angle) * speed * 0.5,
                    Math.sin(angle) * speed * 0.5,
                );
            } else {
                enemy.setVelocity(0, 0);
            }
        }
    }

    protected applyBobbing(enemy: GameEnemy, time: number, baseScale: number): void {
        enemy.setScale(baseScale + Math.sin(time * 0.005 + enemy.x) * 0.05);
    }
}