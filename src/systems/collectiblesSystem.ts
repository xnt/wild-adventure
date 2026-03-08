import Phaser from 'phaser';
import {
    NUM_CHESTS,
    CHEST_CONTENTS,
    CHEST_INTERACT_RANGE,
    NUM_TRIFORCE_PIECES,
    TRIFORCE_BONUS_HP,
} from '../constants.js';
import type { GameChest } from '../types.js';

/**
 * CollectiblesSystem — handles chests, triforce pieces, and compass.
 *
 * Decoupled from GameScene; manages chest creation, opening logic,
 * and callbacks for item collection.
 */
export class CollectiblesSystem {
    scene: Phaser.Scene;
    chests: GameChest[] = [];
    triforcePieces = 0;
    hasCompass = false;

    // Callbacks
    onTriforceCollected?: (pieceIndex: number) => void;
    onTriforceComplete?: () => void;
    onCompassCollected?: () => void;
    onChestOpened?: (label: string) => void;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Create chests at the pre-generated positions.
     */
    createChests(chestPositions: { x: number; y: number }[]): void {
        this.chests = [];
        chestPositions.forEach((pos, i) => {
            const chest = this.scene.physics.add.sprite(pos.x, pos.y, 'chest_closed') as GameChest;
            chest.setDepth(3).setImmovable(true);
            chest.opened = false;
            chest.chestIndex = i;
            chest.content = CHEST_CONTENTS[i];

            // Subtle float animation
            this.scene.tweens.add({
                targets: chest,
                y: pos.y - 4,
                duration: 1200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            this.chests.push(chest);
        });
    }

    /**
     * Check for player proximity to chests and open them.
     * Call from scene's update().
     */
    update(playerX: number, playerY: number): void {
        for (const chest of this.chests) {
            if (chest.opened) continue;

            const dist = Phaser.Math.Distance.Between(
                playerX, playerY, chest.x, chest.y,
            );
            if (dist > CHEST_INTERACT_RANGE) continue;

            this.openChest(chest);
        }
    }

    /**
     * Open a chest and process its contents.
     */
    openChest(chest: GameChest): void {
        chest.opened = true;
        chest.setTexture('chest_opened');

        const { content } = chest;

        switch (content.type) {
            case 'triforce_piece':
                this.collectTriforcePiece(chest);
                break;
            case 'compass':
                this.collectCompass(chest);
                break;
        }
    }

    /**
     * Collect a triforce piece from a chest.
     */
    collectTriforcePiece(chest: GameChest): void {
        this.triforcePieces++;

        // Spawn floating piece animation
        const piece = this.scene.add.image(chest.x, chest.y - 16, 'triforce_piece')
            .setDepth(10).setScale(1.5);

        this.scene.tweens.add({
            targets: piece,
            y: piece.y - 32,
            alpha: 0,
            scaleX: 2.5,
            scaleY: 2.5,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => piece.destroy(),
        });

        this.onTriforceCollected?.(this.triforcePieces);

        // Camera flash (gold)
        this.scene.cameras.main.flash(300, 255, 215, 0, false);

        // Check for complete triforce
        if (this.triforcePieces >= NUM_TRIFORCE_PIECES) {
            this.onTriforceComplete?.();
        }
    }

    /**
     * Collect the compass from a chest.
     */
    collectCompass(chest: GameChest): void {
        this.hasCompass = true;

        // Spawn floating compass animation
        const compassIcon = this.scene.add.image(chest.x, chest.y - 16, 'compass')
            .setDepth(10).setScale(1.5);

        this.scene.tweens.add({
            targets: compassIcon,
            y: compassIcon.y - 32,
            alpha: 0,
            scaleX: 2.5,
            scaleY: 2.5,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => compassIcon.destroy(),
        });

        this.onCompassCollected?.();

        // Camera flash (cyan)
        this.scene.cameras.main.flash(300, 100, 200, 255, false);
    }

    /**
     * Get all chests (for collision setup, etc.).
     */
    getChests(): GameChest[] {
        return this.chests;
    }

    /**
     * Get current triforce piece count.
     */
    getTriforcePieces(): number {
        return this.triforcePieces;
    }

    /**
     * Check if player has compass.
     */
    getHasCompass(): boolean {
        return this.hasCompass;
    }

    /**
     * Reset system state (for restart).
     */
    reset(): void {
        this.chests.forEach((chest) => {
            if (chest.active) {
                chest.destroy();
            }
        });
        this.chests = [];
        this.triforcePieces = 0;
        this.hasCompass = false;
    }
}
