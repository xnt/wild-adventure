import Phaser from 'phaser';
import {
    PLAYER_SPEED,
    IFRAMES_DUR,
    ENEMY_DMG,
    TILE_IDS,
} from '../constants.js';
import type { Facing, PlayerIntent } from '../types.js';
import {
    getFacingFromVelocity,
    calcNormalizedVelocity,
    getAnimKey,
    calcIframesAlpha,
    calcKnockbackVelocity,
} from '../gameSceneUtils.js';

/**
 * PlayerController — handles player movement, facing, animation selection,
 * and damage/knockback state.
 *
 * Decoupled from input; receives PlayerIntent from input sources.
 */
export class PlayerController {
    scene: Phaser.Scene;
    player!: Phaser.Physics.Arcade.Sprite;

    // State
    facing: Facing = 'down';
    isAttacking = false;
    lastHitTime = 0;
    playerHP = 0;
    currentBiome: number = TILE_IDS.PLAINS;

    // Movement constants
    private readonly ACCEL_DEFAULT = 2000;
    private readonly DRAG_DEFAULT = 2500;
    private readonly ACCEL_SNOW = 600;
    private readonly DRAG_SNOW = 150;
    private readonly SPEED_SNOW = PLAYER_SPEED * 1.3;
    private readonly SPEED_SWAMP = PLAYER_SPEED * 0.6;

    // Callbacks for external integration
    onDamage?: (hp: number) => void;
    onDeath?: () => void;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Create the player sprite at the given position.
     */
    createPlayer(x: number, y: number, frame: number): void {
        this.player = this.scene.physics.add.sprite(x, y, 'player', frame);
        this.player.setDepth(5);
        this.player.setCollideWorldBounds(true);
        this.player.body!.setSize(20, 22);
        this.player.body!.setOffset(6, 8);
        
        // Default movement physics
        this.player.setDrag(this.DRAG_DEFAULT);
        this.player.setMaxVelocity(PLAYER_SPEED);
        
        this.player.play('idle_down');
    }

    /**
     * Update current biome to affect movement physics.
     */
    setBiome(biome: number): void {
        if (this.currentBiome === biome) return;
        this.currentBiome = biome;

        switch (biome) {
            case TILE_IDS.SNOW:
                this.player.setDrag(this.DRAG_SNOW);
                this.player.setMaxVelocity(this.SPEED_SNOW);
                break;
            case TILE_IDS.SWAMP:
                this.player.setDrag(this.DRAG_DEFAULT);
                this.player.setMaxVelocity(this.SPEED_SWAMP);
                break;
            default:
                this.player.setDrag(this.DRAG_DEFAULT);
                this.player.setMaxVelocity(PLAYER_SPEED);
                break;
        }
    }

    /**
     * Create player animations if they don't exist.
     */
    createAnimations(frames: Record<string, number>): void {
        if (this.scene.anims.exists('idle_up')) return;

        this.scene.anims.create({ key: 'idle_up', frames: [{ key: 'player', frame: frames.IDLE_N }], frameRate: 1 });
        this.scene.anims.create({ key: 'idle_down', frames: [{ key: 'player', frame: frames.IDLE_S }], frameRate: 1 });
        this.scene.anims.create({ key: 'idle_right', frames: [{ key: 'player', frame: frames.IDLE_E }], frameRate: 1 });
        this.scene.anims.create({ key: 'idle_left', frames: [{ key: 'player', frame: frames.IDLE_W }], frameRate: 1 });

        this.scene.anims.create({
            key: 'walk_down',
            frames: [{ key: 'player', frame: frames.WALK_S1 }, { key: 'player', frame: frames.WALK_S2 }],
            frameRate: 8, repeat: -1,
        });
        this.scene.anims.create({
            key: 'walk_right',
            frames: [{ key: 'player', frame: frames.WALK_E1 }, { key: 'player', frame: frames.WALK_E2 }],
            frameRate: 8, repeat: -1,
        });
        this.scene.anims.create({
            key: 'walk_up',
            frames: [{ key: 'player', frame: frames.WALK_N1 }, { key: 'player', frame: frames.WALK_N2 }],
            frameRate: 8, repeat: -1,
        });
        this.scene.anims.create({
            key: 'walk_left',
            frames: [{ key: 'player', frame: frames.WALK_W1 }, { key: 'player', frame: frames.WALK_W2 }],
            frameRate: 8, repeat: -1,
        });

        this.scene.anims.create({ key: 'attack_up', frames: [{ key: 'player', frame: frames.ATK_N }], frameRate: 1 });
        this.scene.anims.create({ key: 'attack_down', frames: [{ key: 'player', frame: frames.ATK_S }], frameRate: 1 });
        this.scene.anims.create({ key: 'attack_right', frames: [{ key: 'player', frame: frames.ATK_E }], frameRate: 1 });
        this.scene.anims.create({ key: 'attack_left', frames: [{ key: 'player', frame: frames.ATK_W }], frameRate: 1 });
    }

    /**
     * Set attack state from external system (combat system).
     */
    setAttacking(attacking: boolean): void {
        this.isAttacking = attacking;
    }

    /**
     * Update movement, facing, and animation based on PlayerIntent.
     * Returns true if player is moving.
     */
    update(time: number, intent: PlayerIntent): boolean {
        if (this.isAttacking) {
            this.player.setAcceleration(0, 0);
            return false;
        }

        // Use intent directly
        const ix = intent.moveX;
        const iy = intent.moveY;

        // Determine acceleration based on biome
        const accelMag = this.currentBiome === TILE_IDS.SNOW ? this.ACCEL_SNOW : this.ACCEL_DEFAULT;
        
        if (ix !== 0 || iy !== 0) {
            // Normalize acceleration
            const length = Math.sqrt(ix * ix + iy * iy);
            this.player.setAcceleration((ix / length) * accelMag, (iy / length) * accelMag);
        } else {
            this.player.setAcceleration(0, 0);
        }

        // Update facing based on current velocity
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.x !== 0 || body.velocity.y !== 0) {
            this.facing = getFacingFromVelocity(body.velocity.x, body.velocity.y, this.facing);
        }

        // Update animation
        const isMoving = body.velocity.x !== 0 || body.velocity.y !== 0;
        const animKey = getAnimKey(this.facing, isMoving);
        if (this.player.anims.currentAnim?.key !== animKey) {
            this.player.play(animKey, true);
        }

        // Iframes alpha flicker
        const alpha = calcIframesAlpha(time, this.lastHitTime, IFRAMES_DUR);
        this.player.setAlpha(alpha);

        return isMoving;
    }

    /**
     * Apply damage to the player with knockback.
     */
    takeDamage(source: { x: number; y: number }, time: number): void {
        if (time - this.lastHitTime < IFRAMES_DUR) return;

        this.lastHitTime = time;
        this.playerHP -= ENEMY_DMG;

        const { vx, vy } = calcKnockbackVelocity(source, this.player, 300);
        this.player.setVelocity(vx, vy);

        this.scene.cameras.main.shake(100, 0.01);
        this.player.setTint(0xff0000);
        this.scene.time.delayedCall(150, () => this.player.clearTint());

        if (this.playerHP <= 0) {
            this.playerHP = 0;
            this.onDeath?.();
        } else {
            this.onDamage?.(this.playerHP);
        }
    }

    /**
     * Heal the player.
     */
    heal(amount: number, maxHP: number): void {
        this.playerHP = Math.min(maxHP, this.playerHP + amount);
    }

    /**
     * Set player HP directly (e.g., for initialization or triforce bonus).
     */
    setHP(hp: number): void {
        this.playerHP = hp;
    }

    /**
     * Get current HP.
     */
    getHP(): number {
        return this.playerHP;
    }

    /**
     * Get current facing direction.
     */
    getFacing(): Facing {
        return this.facing;
    }

    /**
     * Play idle animation for current facing.
     */
    playIdle(): void {
        this.player.play(`idle_${this.facing}`, true);
    }

    /**
     * Play attack animation for current facing.
     */
    playAttack(): void {
        this.player.play(`attack_${this.facing}`, true);
    }

    /**
     * Stop player velocity.
     */
    stop(): void {
        this.player.setVelocity(0, 0);
    }

    /**
     * Get player position.
     */
    getPosition(): { x: number; y: number } {
        return { x: this.player.x, y: this.player.y };
    }
}
