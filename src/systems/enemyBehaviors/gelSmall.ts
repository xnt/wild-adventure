import type { GameEnemy, PositionedObject } from '../../types.js';
import { BaseEnemyBehavior } from './base.js';

export class GelSmallBehavior extends BaseEnemyBehavior {
    update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
        if (enemy.isDying) return false;
        this.updateMovement(enemy, player, time);
        this.applyBobbing(enemy, time, 0.5);
        return false;
    }
}