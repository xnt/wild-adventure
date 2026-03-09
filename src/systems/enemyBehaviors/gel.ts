import type { GameEnemy, PositionedObject } from '../../types.js';
import { BaseEnemyBehavior } from './base.js';

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