import Phaser from 'phaser';
import {
    NUM_ENEMIES,
    PROJ_LIFETIME,
    ENEMY_CONFIGS,
} from '../constants.js';
import type { GameEnemy, PositionedObject } from '../types.js';
import { WorldFactory } from '../worldFactory.js';
import { CollectibleSystem } from './collectiblesSystem.js';
import {
    createDeathEffect,
    calcProjectileParams,
} from '../gameSceneUtils.js';
import { createBehavior } from './enemyBehaviors/index.js';

/**
 * EnemySystem — handles enemy spawning, AI updates, shooting,
 * death effects, and heart drops.
 *
 * Decoupled from GameScene; manages its own groups and callbacks.
 */
export class EnemySystem {
    scene: Phaser.Scene;
    enemies!: Phaser.Physics.Arcade.Group;
    enemyProjectiles!: Phaser.Physics.Arcade.Group;
    obstacleLayer!: Phaser.Physics.Arcade.StaticGroup;
    waterLayer!: Phaser.Physics.Arcade.StaticGroup;
    collectibleSystem!: CollectibleSystem;

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
    init(
        obstacleLayer: Phaser.Physics.Arcade.StaticGroup, 
        waterLayer: Phaser.Physics.Arcade.StaticGroup,
        collectibleSystem: CollectibleSystem
    ): void {
        this.obstacleLayer = obstacleLayer;
        this.waterLayer = waterLayer;
        this.collectibleSystem = collectibleSystem;
        this.enemies = this.scene.physics.add.group();
        this.enemyProjectiles = this.scene.physics.add.group();

        // Projectiles collide with obstacles (trees/rocks)
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
    createEnemies(worldFactory: WorldFactory, mapData: number[][], playerX: number, playerY: number): void {
        this.mapData = mapData;
        this.playerPos = { x: playerX, y: playerY };

        const typeCycle = ['goblin', 'wizrobe', 'gel', 'goblin', 'wizrobe', 'gel', 'lynel', 'octorok', 'octorok', 'octorok'];
        let spawned = 0;
        let attempts = 0;

        while (spawned < this.totalEnemies && attempts < 500) {
            attempts++;

            const enemyType = typeCycle[spawned];
            const isOctorok = enemyType === 'octorok';
            
            const spawn = isOctorok 
                ? worldFactory.getWaterSpawn(mapData, this.playerPos)
                : worldFactory.getValidSpawn(mapData, this.playerPos);
                
            if (!spawn) continue;

            const { x, y } = spawn;
            const config = ENEMY_CONFIGS[enemyType];

            const enemy = this.scene.physics.add.sprite(x, y, config.texture) as GameEnemy;
            enemy.setDepth(4).setCollideWorldBounds(true);
            enemy.body!.setSize(22, 22).setOffset(5, 5);

            if (config.scale) {
                enemy.setScale(config.scale);
                enemy.body!.setSize(26, 26).setOffset(3, 3);
            }

            if (enemyType === 'gel') {
                enemy.body!.setSize(18, 14).setOffset(7, 12);
            }

            if (enemyType === 'gel_small') {
                enemy.body!.setSize(14, 10).setOffset(9, 14);
            }

            if (isOctorok) {
                // Octoroks hide initially
                enemy.setAlpha(0);
            }

            enemy.type         = enemyType;
            enemy.hp           = config.hp;
            enemy.speedMult    = config.speedMult;
            enemy.shoots       = config.shoots;
            if (config.shoots) {
                enemy.projSpeed    = config.projSpeed;
                enemy.shootCd      = config.shootCd;
                enemy.lastShotTime = Phaser.Math.Between(0, config.shootCd ?? 2500);
            }
            enemy.patrolTarget = new Phaser.Math.Vector2(x, y);
            enemy.patrolTimer  = 0;
            enemy.isChasing    = false;
            enemy.isDying      = false;
            enemy.behavior     = createBehavior(enemyType);

            this.enemies.add(enemy);
            spawned++;
        }
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
        this.playerPos = player; // Keep player position updated
        (this.enemies.getChildren() as GameEnemy[]).forEach((enemy) => {
            if (enemy.behavior) {
                const shouldShoot = enemy.behavior.update(enemy, player, time);
                if (shouldShoot) {
                    this.enemyShoot(enemy);
                }
            }
        });
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

        enemy.hp = (enemy.hp || 1) - 1;

        // Visual feedback
        enemy.setTint(0xffffff);
        this.scene.time.delayedCall(150, () => {
            if (enemy.active) {
                enemy.clearTint();
            }
        });

        if (enemy.behavior?.onDamage) {
            enemy.behavior.onDamage(enemy, this);
        } else if (enemy.hp <= 0) {
            this.killEnemy(enemy);
        }

        return enemy.hp <= 0;
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
                this.collectibleSystem.spawnCollectible(enemy.x, enemy.y, 'heart');
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
            gel.behavior = createBehavior('gel_small');

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
     * Get enemies group.
     */
    getEnemies(): Phaser.Physics.Arcade.Group {
        return this.enemies;
    }
}
