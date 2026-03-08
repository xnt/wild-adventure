import Phaser from 'phaser';
import type { PlayerIntent, InputSource } from '../types.js';

/**
 * KeyboardInputSource — translates keyboard input into PlayerIntent.
 * Supports both cursor keys and WASD for movement, SPACE for attack.
 */
export class KeyboardInputSource implements InputSource {
    private scene: Phaser.Scene;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private attackPressed = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.initKeys();
    }

    private initKeys(): void {
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

    getIntent(): PlayerIntent {
        const left = this.cursors.left!.isDown || this.wasd.left.isDown;
        const right = this.cursors.right!.isDown || this.wasd.right.isDown;
        const up = this.cursors.up!.isDown || this.wasd.up.isDown;
        const down = this.cursors.down!.isDown || this.wasd.down.isDown;

        let moveX = 0;
        let moveY = 0;
        if (left) moveX -= 1;
        if (right) moveX += 1;
        if (up) moveY -= 1;
        if (down) moveY += 1;

        return {
            moveX,
            moveY,
            attack: this.attackPressed,
        };
    }

    update(): void {
        // Check for just-pressed attack (one-shot)
        this.attackPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey);
    }

    destroy(): void {
        // No explicit cleanup needed for keyboard
    }

    /** Expose spaceKey for restart key checks in GameScene */
    getSpaceKey(): Phaser.Input.Keyboard.Key {
        return this.spaceKey;
    }
}

/**
 * TouchInputSource — translates touch input into PlayerIntent.
 * Left 70% of screen for movement, right 30% for attack.
 */
export class TouchInputSource implements InputSource {
    private scene: Phaser.Scene;
    private moveX = 0;
    private moveY = 0;
    private attack = false;
    private attackConsumed = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupTouchListeners();
    }

    private setupTouchListeners(): void {
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
    }

    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        // Right 30% of screen = attack zone
        if (pointer.x > this.scene.scale.width * 0.7) {
            this.attack = true;
            this.attackConsumed = false;
        }
    }

    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        // Left 70% of screen = movement zone
        if (pointer.isDown && pointer.x <= this.scene.scale.width * 0.7) {
            const dx = pointer.x - pointer.downX;
            const dy = pointer.y - pointer.downY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 10) {
                this.moveX = dx / dist;
                this.moveY = dy / dist;
            } else {
                this.moveX = 0;
                this.moveY = 0;
            }
        }
    }

    private onPointerUp(): void {
        this.moveX = 0;
        this.moveY = 0;
        this.attack = false;
    }

    getIntent(): PlayerIntent {
        return {
            moveX: this.moveX,
            moveY: this.moveY,
            attack: this.attack && !this.attackConsumed,
        };
    }

    update(): void {
        // Mark attack as consumed after this frame
        if (this.attack && !this.attackConsumed) {
            this.attackConsumed = true;
        }
    }

    destroy(): void {
        this.scene.input.off('pointerdown', this.onPointerDown, this);
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
    }
}

/**
 * CompositeInputSource — combines multiple input sources.
 * Movement is summed (and clamped), attack is OR'd.
 * This allows keyboard + touch to work simultaneously.
 */
export class CompositeInputSource implements InputSource {
    private sources: InputSource[];

    constructor(sources: InputSource[]) {
        this.sources = sources;
    }

    getIntent(): PlayerIntent {
        let moveX = 0;
        let moveY = 0;
        let attack = false;

        for (const source of this.sources) {
            const intent = source.getIntent();
            moveX += intent.moveX;
            moveY += intent.moveY;
            attack = attack || intent.attack;
        }

        // Clamp movement to [-1, 1]
        const mag = Math.sqrt(moveX * moveX + moveY * moveY);
        if (mag > 1) {
            moveX /= mag;
            moveY /= mag;
        }

        return { moveX, moveY, attack };
    }

    update(): void {
        for (const source of this.sources) {
            source.update();
        }
    }

    destroy(): void {
        for (const source of this.sources) {
            source.destroy();
        }
    }
}
