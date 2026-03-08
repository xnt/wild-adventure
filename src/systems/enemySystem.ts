import Phaser from 'phaser';
import {
    NUM_ENEMIES,
    PROJ_LIFETIME,
    ENEMY_CONFIGS,
} from '../constants.js';
import type { GameEnemy, PositionedObject } from '../types.js';
import {
    createEnemies,
    updateEnemies,
    createDeathEffect,
    calcProjectileParams,
} from '../gameSceneUtils.js';

/**
 * EnemySystem — handles enemy spawning, AI updates, shooting,
 * death effects, and heart drops.
 *
 * Decoupled from GameScene; manages its own groups and callbacks.
 */
export class EnemySystem {
    scene: Phaser.Scene;
    enemies!: Phaser.Physics.Arcade.Group;
    heartDrops!: Phaser.Physics.Arcade.Group;
    enemyProjectiles!: Phaser.Physics.Arcade.Group;
    obstacleLayer!: Phaser.Physics.Arcade.StaticGroup;

    // State
    enemiesKilled = 0;
    totalEnemies = NUM_ENEMIES;
    mapData: number[][] = [];
    playerPos: PositionedObject = { x: 0, y: 0 };

    // Callbacks
    onEnemyKilled?: () => void;
    onPlayerHitByEnemy?: (enemy: GameEnemy) => void;
    onPlayerHitByProjectile?: (proj: Phaser.Physics.Arcade.Sprite) => void;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Initialize groups. Call from scene's create().
     */
    init(obstacleLayer: Phaser.Physics.Arcade.StaticGroup): void {
        this.obstacleLayer = obstacleLayer;
        this.enemies = this.scene.physics.add.group();
        this.heartDrops = this.scene.physics.add.group();
        this.enemyProjectiles = this.scene.physics.add.group();

        // Projectiles collide with obstacles
        this.scene.physics.add.collider(
            this.enemyProjectiles,
            this.obstacleLayer,
            (proj) => (proj as Phaser.Physics.Arcade.Sprite).destroy(),
            undefined,
            this,
        );
    }

    /**
     * Create enemies at valid spawn positions.
     */
    createEnemies(mapData: number[][], playerX: number, playerY: number): void {
        this.mapData = mapData;
        this.playerPos = { x: playerX, y: playerY };

        const enemyList = createEnemies(
            this.scene,
            this.totalEnemies,
            mapData,
            this.playerPos,
        );

        enemyList.forEach((enemy) => this.enemies.add(enemy));
    }

    /**
     * Set up collision between enemies and player.
     */
    setupPlayerCollisions(player: Phaser.Physics.Arcade.Sprite): void {
        // Enemy body collision
        this.scene.physics.add.overlap(
            player,
            this.enemies,
            (_p, enemy) => {
                const enemyTyped = enemy as GameEnemy;
                if (enemyTyped.isDying) return;
                this.onPlayerHitByEnemy?.(enemyTyped);
            },
            undefined,
            this,
        );

        // Projectile collision
        this.scene.physics.add.overlap(
            player,
            this.enemyProjectiles,
            (_p, proj) => {
                this.onPlayerHitByProjectile?.(proj as Phaser.Physics.Arcade.Sprite);
                (proj as Phaser.Physics.Arcade.Sprite).destroy();
            },
            undefined,
            this,
        );
    }

    /**
     * Update all enemies (AI, shooting).
     */
    update(time: number, player: PositionedObject): void {
        const shooters = updateEnemies(this.enemies, player, time);
        for (const enemy of shooters) {
            this.enemyShoot(enemy);
        }
    }

    /**
     * Fire a projectile from a Wizrobe enemy.
     */
    enemyShoot(enemy: GameEnemy): void {
        const { angle, startX, startY } = calcProjectileParams(
            enemy,
            this.playerPos,
        );

        const proj = this.scene.physics.add.sprite(startX, startY, 'enemy_proj');
        proj.setDepth(3);
        proj.setScale(0.75);
        proj.setRotation(angle);

        proj.body!.enable = true;
        proj.body!.setAllowGravity(false);
        proj.body!.setImmovable(false);

        this.enemyProjectiles.add(proj);

        const speed = enemy.projSpeed || 80;
        proj.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
        );

        // Auto-destroy after lifetime
        this.scene.time.delayedCall(PROJ_LIFETIME, () => {
            if (proj.active) {
                proj.destroy();
            }
        });
    }

    /**
     * Damage an enemy. Returns true if enemy was killed.
     */
    damageEnemy(enemy: GameEnemy): boolean {
        if (enemy.isDying) return false;

        const oldHp = enemy.hp;
        enemy.hp = (enemy.hp || 1) - 1;

        // Visual feedback
        enemy.setTint(0xffffff);
        this.scene.time.delayedCall(150, () => {
            if (enemy.active) {
                enemy.clearTint();
            }
        });

        if (enemy.hp <= 0) {
            if (enemy.type === 'gel') {
                this.splitGel(enemy);
                return true;
            }
            this.killEnemy(enemy);
            return true;
        }

        return false;
    }

    /**
     * Kill an enemy, spawn heart drop, trigger effects.
     */
    killEnemy(enemy: GameEnemy): void {
        if (enemy.isDying) return;
        enemy.isDying = true;
        enemy.body!.enable = false;
        this.enemiesKilled++;

        createDeathEffect(this.scene, enemy.x, enemy.y);

        this.scene.tweens.add({
            targets: enemy,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 300,
            onComplete: () => {
                const heart = this.scene.physics.add.sprite(enemy.x, enemy.y, 'heart_drop')
                    .setDepth(3)
                    .setScale(1.2);
                this.heartDrops.add(heart);

                this.scene.tweens.add({
                    targets: heart,
                    y: heart.y - 8,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });

                enemy.destroy();
                this.onEnemyKilled?.();
            },
        });
    }

    /**
     * Split a gel enemy into two smaller gels.
     */
    splitGel(enemy: GameEnemy): void {
        enemy.isDying = true;
        enemy.body!.enable = false;
        this.totalEnemies += 1;

        const offsets = [-10, 10];
        offsets.forEach((offset) => {
            const spawnX = enemy.x + offset;
            const spawnY = enemy.y - offset;
            const gel = this.scene.physics.add.sprite(spawnX, spawnY, 'gel') as GameEnemy;
            const config = ENEMY_CONFIGS.gel_small;

            gel.setDepth(4).setCollideWorldBounds(true);
            gel.setScale(config.scale ?? 0.5);
            gel.body!.setSize(14, 10).setOffset(9, 14);

            gel.type = 'gel_small';
            gel.hp = config.hp;
            gel.speedMult = config.speedMult;
            gel.shoots = false;
            gel.patrolTarget = new Phaser.Math.Vector2(spawnX, spawnY);
            gel.patrolTimer = 0;
            gel.isChasing = false;
            gel.isDying = false;

            this.enemies.add(gel);
        });

        enemy.destroy();
        this.onEnemyKilled?.();
    }

    /**
     * Get remaining enemy count.
     */
    getRemaining(): number {
        return this.totalEnemies - this.enemiesKilled;
    }

    /**
     * Get all living enemies (for compass, etc.).
     */
    getLivingEnemies(): GameEnemy[] {
        return (this.enemies.getChildren() as GameEnemy[]).filter(
            (e) => e.active && !e.isDying,
        );
    }

    /**
     * Get heart drops group (for pickup collision).
     */
    getHeartDrops(): Phaser.Physics.Arcade.Group {
        return this.heartDrops;
    }

    /**
     * Get enemies group.
     */
    getEnemies(): Phaser.Physics.Arcade.Group {
        return this.enemies;
    }
}
