import Phaser from 'phaser';
import type { GameEnemy, PositionedObject } from '../../types.js';
import { CHASE_RANGE } from '../../constants.js';
import { BaseEnemyBehavior } from './base.js';

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