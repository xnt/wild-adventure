import Phaser from 'phaser';
import type { GameEnemy, PositionedObject } from '../../types.js';
import { CHASE_RANGE } from '../../constants.js';
import { BaseEnemyBehavior } from './base.js';

export class OctorokBehavior extends BaseEnemyBehavior {
    private readonly EMERGE_DIST = CHASE_RANGE * 1.2;

    update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
        if (enemy.isDying) return false;

        const dist = Phaser.Math.Distance.Between(
            enemy.x, enemy.y, player.x, player.y,
        );

        const isVisible = dist < this.EMERGE_DIST;
        enemy.setAlpha(isVisible ? 1 : 0);
        
        // Octoroks are static, so no movement update.
        // They only shoot when visible.
        if (isVisible && enemy.shoots) {
            if (!enemy.lastShotTime) enemy.lastShotTime = 0;
            const cd = enemy.shootCd || 2000;
            if (time - enemy.lastShotTime > cd) {
                enemy.lastShotTime = time;
                return true;
            }
        }
        return false;
    }
}
