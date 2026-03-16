import Phaser from 'phaser';
import {
    ATTACK_RANGE,
    ATTACK_DUR,
    ATTACK_CD,
} from '../constants.js';
import type { Facing, GameEnemy, GameSystem } from '../types.js';
import type { EventBus } from './eventBus.js';
import {
    calcAttackOffset,
    getSwordDimensions,
    isAttackReady,
    createSlashEffect,
} from '../gameSceneUtils.js';

/**
 * CombatSystem — handles player attack timing, sword hitbox creation,
 * and enemy damage application.
 *
 * Decoupled from GameScene; works with playerController to get facing/state.
 */
export class CombatSystem implements GameSystem {
    scene: Phaser.Scene;
    private eventBus: EventBus;
    swordGroup!: Phaser.Physics.Arcade.Group;
    enemiesGroup!: Phaser.Physics.Arcade.Group;

    // Attack state
    isAttacking = false;
    lastAttackTime = 0;

    constructor(scene: Phaser.Scene, eventBus: EventBus) {
        this.scene = scene;
        this.eventBus = eventBus;
    }

    /**
     * Initialize the sword group and set up collision with enemies.
     */
    init(swordGroup: Phaser.Physics.Arcade.Group, enemiesGroup: Phaser.Physics.Arcade.Group): void {
        this.swordGroup = swordGroup;
        this.enemiesGroup = enemiesGroup;

        // Sword vs enemies overlap
        this.scene.physics.add.overlap(
            this.swordGroup,
            this.enemiesGroup,
            (sword, enemy) => {
                const enemyTyped = enemy as GameEnemy;
                if (enemyTyped.isDying) return;
                this.eventBus.emit('combat:enemyHit', { enemy: enemyTyped });
                (sword as Phaser.Physics.Arcade.Sprite).destroy();
            },
            (sword, enemy) => !(enemy as GameEnemy).isDying,
            this,
        );
    }

    /**
     * Create the sword physics group.
     */
    createSwordGroup(): Phaser.Physics.Arcade.Group {
        this.swordGroup = this.scene.physics.add.group();
        return this.swordGroup;
    }

    /**
     * Check if attack should trigger and execute it.
     * Returns true if attack was initiated.
     */
    update(time: number, playerX: number, playerY: number, facing: Facing, justPressed: boolean): boolean {
        if (isAttackReady(justPressed, this.isAttacking, time, this.lastAttackTime, ATTACK_CD)) {
            this.executeAttack(time, playerX, playerY, facing);
            return true;
        }
        return false;
    }

    /**
     * Execute the attack: create sword hitbox, play effects.
     */
    executeAttack(time: number, playerX: number, playerY: number, facing: Facing): void {
        this.isAttacking = true;
        this.lastAttackTime = time;

        this.eventBus.emit('combat:attackStarted', undefined);

        const { offX, offY } = calcAttackOffset(facing, ATTACK_RANGE);
        const { width, height } = getSwordDimensions(facing);

        // Create temporary sword hitbox
        const sword = this.scene.add.rectangle(
            playerX + offX,
            playerY + offY,
            width, height,
            0xffffff, 0.3,
        ).setDepth(6);

        this.scene.physics.add.existing(sword);
        this.swordGroup.add(sword);

        // Slash effect
        createSlashEffect(this.scene, playerX + offX, playerY + offY);

        // Cleanup after attack duration
        this.scene.time.delayedCall(ATTACK_DUR, () => {
            if (sword && sword.active) {
                sword.destroy();
            }
            this.isAttacking = false;
            this.eventBus.emit('combat:attackEnded', undefined);
        });
    }

    /**
     * Check if currently attacking.
     */
    getIsAttacking(): boolean {
        return this.isAttacking;
    }

    /**
     * Set attacking state (for external control).
     */
    setAttacking(attacking: boolean): void {
        this.isAttacking = attacking;
    }
}
