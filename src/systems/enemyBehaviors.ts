import Phaser from 'phaser';
import type { GameEnemy, PositionedObject, EnemyBehavior } from '../types.js';
import {
    ENEMY_SPEED,
    CHASE_RANGE,
    TILE_SIZE,
    MAP_COLS,
    MAP_ROWS,
    ENEMY_CONFIGS,
} from '../constants.js';

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

export class GoblinBehavior extends BaseEnemyBehavior {
    update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
        if (enemy.isDying) return false;
        this.updateMovement(enemy, player, time);
        this.applyBobbing(enemy, time, 1);
        return false;
    }
}

export class WizrobeBehavior extends BaseEnemyBehavior {
    update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
        if (enemy.isDying) return false;
        this.updateMovement(enemy, player, time);
        this.applyBobbing(enemy, time, 1);

        const dist = Phaser.Math.Distance.Between(
            enemy.x, enemy.y, player.x, player.y,
        );

        if (enemy.shoots && dist < CHASE_RANGE * 1.5) {
            if (!enemy.lastShotTime) enemy.lastShotTime = 0;
            const cd = enemy.shootCd || 2500;
            if (time - enemy.lastShotTime > cd) {
                enemy.lastShotTime = time;
                return true;
            }
        }
        return false;
    }
}

export class LynelBehavior extends BaseEnemyBehavior {
    update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
        if (enemy.isDying) return false;
        this.updateMovement(enemy, player, time);
        this.applyBobbing(enemy, time, 1.2);
        return false;
    }
}

export class GelBehavior extends BaseEnemyBehavior {
    update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
        if (enemy.isDying) return false;
        this.updateMovement(enemy, player, time);
        this.applyBobbing(enemy, time, 0.7);
        return false;
    }

    onDamage(enemy: GameEnemy, enemySystem: any): void {
        if (enemy.hp <= 0) {
            enemySystem.splitGel(enemy);
        }
    }
}

export class GelSmallBehavior extends BaseEnemyBehavior {
    update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
        if (enemy.isDying) return false;
        this.updateMovement(enemy, player, time);
        this.applyBobbing(enemy, time, 0.5);
        return false;
    }
}

/**
 * Factory to create behavior based on enemy type.
 */
export function createBehavior(type: string): EnemyBehavior {
    switch (type) {
        case 'wizrobe': return new WizrobeBehavior();
        case 'lynel': return new LynelBehavior();
        case 'gel': return new GelBehavior();
        case 'gel_small': return new GelSmallBehavior();
        case 'goblin':
        default:
            return new GoblinBehavior();
    }
}
