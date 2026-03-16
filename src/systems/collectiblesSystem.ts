import Phaser from 'phaser';
import {
    NUM_CHESTS,
    CHEST_CONTENTS,
    CHEST_INTERACT_RANGE,
    NUM_TRIFORCE_PIECES,
    TRIFORCE_BONUS_HP,
    MAX_HP,
    HEART_HP,
} from '../constants.js';
import type { GameChest, GameCollectible, CollectibleType, CollectibleDefinition, GameSystem, SceneWithPlayer } from '../types.js';
import type { EventBus } from './eventBus.js';

/**
 * CollectibleSystem — unified system for all pickups (hearts, triforce, compass, etc.)
 * Handles both chests and loose pickups.
 */
export class CollectibleSystem implements GameSystem {
    scene: Phaser.Scene;
    private eventBus: EventBus;
    chests: GameChest[] = [];
    collectibles: Phaser.Physics.Arcade.Group;

    // Progress state
    triforcePieces = 0;
    hasCompass = false;
    hasSnorkel = false;

    // Definitions
    private definitions: Record<CollectibleType, CollectibleDefinition>;

    constructor(scene: Phaser.Scene, eventBus: EventBus) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.collectibles = this.scene.physics.add.group();
        
        this.definitions = {
            heart: {
                type: 'heart',
                texture: 'heart_full',
                label: 'Heart',
                onPickup: (scene: SceneWithPlayer) => {
                    const effectiveMax = this.triforcePieces >= NUM_TRIFORCE_PIECES
                        ? TRIFORCE_BONUS_HP
                        : MAX_HP;
                    scene.playerController.heal(HEART_HP, effectiveMax);
                    this.eventBus.emit('collectible:heartCollected', undefined);
                }
            },
            triforce_piece: {
                type: 'triforce_piece',
                texture: 'triforce_piece',
                label: 'Triforce Piece',
                onPickup: (scene: SceneWithPlayer) => {
                    this.triforcePieces++;
                    this.eventBus.emit('collectible:triforceCollected', { pieceIndex: this.triforcePieces });
                    scene.cameras.main.flash(300, 255, 215, 0, false);
                    if (this.triforcePieces >= NUM_TRIFORCE_PIECES) {
                        this.eventBus.emit('collectible:triforceComplete', undefined);
                    }
                }
            },
            compass: {
                type: 'compass',
                texture: 'compass',
                label: 'Compass',
                onPickup: (scene: SceneWithPlayer) => {
                    this.hasCompass = true;
                    this.eventBus.emit('collectible:compassCollected', undefined);
                    scene.cameras.main.flash(300, 100, 200, 255, false);
                }
            },
            key: {
                type: 'key',
                texture: 'key',
                label: 'Key',
                onPickup: () => { /* Future use */ }
            },
            potion: {
                type: 'potion',
                texture: 'potion',
                label: 'Potion',
                onPickup: () => { /* Future use */ }
            },
            snorkel: {
                type: 'snorkel',
                texture: 'snorkel',
                label: 'Snorkel',
                onPickup: (scene: SceneWithPlayer) => {
                    this.hasSnorkel = true;
                    this.eventBus.emit('collectible:snorkelCollected', undefined);
                    scene.cameras.main.flash(300, 0, 150, 255, false);
                }
            }
        };
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
     * Spawn a loose collectible in the world.
     */
    spawnCollectible(x: number, y: number, type: CollectibleType): GameCollectible {
        const def = this.definitions[type];
        const collectible = this.collectibles.create(x, y, def.texture) as GameCollectible;
        collectible.collectibleType = type;
        collectible.setDepth(3).setScale(1.2);

        // Standard float animation for all pickups
        this.scene.tweens.add({
            targets: collectible,
            y: y - 8,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        return collectible;
    }

    /**
     * Set up collision between player and loose collectibles.
     */
    setupPlayerCollisions(player: Phaser.Physics.Arcade.Sprite): void {
        this.scene.physics.add.overlap(
            player,
            this.collectibles,
            (_p, collectible) => {
                this.collect(collectible as GameCollectible);
            },
            undefined,
            this,
        );
    }

    /**
     * Unified collection logic for any GameCollectible.
     */
    collect(collectible: GameCollectible): void {
        const type = collectible.collectibleType;
        const def = this.definitions[type];

        // Apply effect
        def.onPickup?.(this.scene as unknown as SceneWithPlayer, collectible);

        // Renderer: Standard "pop" effect
        const popIcon = this.scene.add.image(collectible.x, collectible.y, def.texture)
            .setDepth(10).setScale(1.5);

        this.scene.tweens.add({
            targets: popIcon,
            y: popIcon.y - 32,
            alpha: 0,
            scaleX: 2.5,
            scaleY: 2.5,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => popIcon.destroy(),
        });

        collectible.destroy();
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
     * Open a chest and process its contents through the unified pipeline.
     */
    openChest(chest: GameChest): void {
        chest.opened = true;
        chest.setTexture('chest_opened');

        const { content } = chest;
        
        // Use unified collection logic by creating a temporary virtual collectible
        // or just calling the definition's onPickup directly.
        // Let's create a visual "pop" as if it was a loose pickup.
        
        const type = content.type as CollectibleType;
        const def = this.definitions[type];
        
        // Apply effect
        def.onPickup?.(this.scene as unknown as SceneWithPlayer, null);

        // Renderer: Standard "pop" effect
        const popIcon = this.scene.add.image(chest.x, chest.y - 16, def.texture)
            .setDepth(10).setScale(1.5);

        this.scene.tweens.add({
            targets: popIcon,
            y: popIcon.y - 32,
            alpha: 0,
            scaleX: 2.5,
            scaleY: 2.5,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => popIcon.destroy(),
        });

        this.eventBus.emit('collectible:chestOpened', { label: content.label });
    }

    getChests(): GameChest[] {
        return this.chests;
    }

    getCollectibles(): Phaser.Physics.Arcade.Group {
        return this.collectibles;
    }

    getTriforcePieces(): number {
        return this.triforcePieces;
    }

    getHasCompass(): boolean {
        return this.hasCompass;
    }

    getHasSnorkel(): boolean {
        return this.hasSnorkel;
    }

    reset(): void {
        this.chests.forEach((chest) => {
            if (chest.active) chest.destroy();
        });
        this.chests = [];
        this.collectibles.clear(true, true);
        this.triforcePieces = 0;
        this.hasCompass = false;
        this.hasSnorkel = false;
    }
}
