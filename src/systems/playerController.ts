import Phaser from 'phaser';
import {
    PLAYER_SPEED,
    IFRAMES_DUR,
    ENEMY_DMG,
} from '../constants.js';
import type { TouchDir, Facing } from '../types.js';
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
 * Decoupled from GameScene; receives refs to player, input keys, and state.
 */
export class PlayerController {
    scene: Phaser.Scene;
    player!: Phaser.Physics.Arcade.Sprite;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    wasd!: {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };
    spaceKey!: Phaser.Input.Keyboard.Key;

    // State
    facing: Facing = 'down';
    isAttacking = false;
    lastHitTime = 0;
    playerHP = 0;
    touchDir: TouchDir = { x: 0, y: 0 };
    touchAttack = false;

    // Callbacks for external integration
    onDamage?: (hp: number) => void;
    onDeath?: () => void;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Initialize input keys. Call from scene's create().
     */
    initInput(): void {
        // @ts-expect-error Phaser input APIs have loose TS defs
        this.cursors = this.scene.input.keyboard.createCursorKeys()!;
        // @ts-expect-error Phaser addKeys interop
        this.wasd = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        }) as {
            up: Phaser.Input.Keyboard.Key;
            down: Phaser.Input.Keyboard.Key;
            left: Phaser.Input.Keyboard.Key;
            right: Phaser.Input.Keyboard.Key;
        };
        // @ts-expect-error Phaser addKey interop
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)!;
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
        this.player.play('idle_down');
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
     * Update movement, facing, and animation.
     * Returns true if player is moving.
     */
    update(time: number): boolean {
        if (this.isAttacking) return false;

        // Read input
        const left = this.cursors.left!.isDown || this.wasd.left.isDown;
        const right = this.cursors.right!.isDown || this.wasd.right.isDown;
        const up = this.cursors.up!.isDown || this.wasd.up.isDown;
        const down = this.cursors.down!.isDown || this.wasd.down.isDown;

        let vx = 0;
        let vy = 0;
        if (left) vx -= 1;
        if (right) vx += 1;
        if (up) vy -= 1;
        if (down) vy += 1;

        // Touch fallback
        if (vx === 0 && vy === 0) {
            vx = this.touchDir.x;
            vy = this.touchDir.y;
        }

        // Normalize velocity
        const normVel = calcNormalizedVelocity(vx, vy, PLAYER_SPEED);
        vx = normVel.vx;
        vy = normVel.vy;

        // Update facing
        this.facing = getFacingFromVelocity(vx, vy, this.facing);

        // Update animation
        const isMoving = vx !== 0 || vy !== 0;
        const animKey = getAnimKey(this.facing, isMoving);
        if (this.player.anims.currentAnim?.key !== animKey) {
            this.player.play(animKey, true);
        }

        this.player.setVelocity(vx, vy);

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
     * Set touch input direction (from touch controls).
     */
    setTouchDir(x: number, y: number): void {
        this.touchDir.x = x;
        this.touchDir.y = y;
    }

    /**
     * Set touch attack flag.
     */
    setTouchAttack(attack: boolean): void {
        this.touchAttack = attack;
    }

    /**
     * Get touch attack flag and clear it.
     */
    consumeTouchAttack(): boolean {
        const wasAttack = this.touchAttack;
        this.touchAttack = false;
        return wasAttack;
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
