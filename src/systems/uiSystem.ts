import Phaser from 'phaser';
import {
    MAX_HP,
    HEART_HP,
    NUM_TRIFORCE_PIECES,
    TRIFORCE_BONUS_HP,
} from '../constants.js';
import { getHeartTexture } from '../gameSceneUtils.js';

/**
 * UISystem — handles hearts HUD, enemy counter, triforce display,
 * compass HUD, overlays, and flash text.
 *
 * Decoupled from GameScene; manages all UI elements independently.
 */
export class UISystem {
    scene: Phaser.Scene;

    // HUD elements
    heartSprites: Phaser.GameObjects.Image[] = [];
    enemyText!: Phaser.GameObjects.Text;
    triforceHudSprites: Phaser.GameObjects.Image[] = [];
    compassHudSprite!: Phaser.GameObjects.Image;
    compassArrow!: Phaser.GameObjects.Image;
    chestFlashText?: Phaser.GameObjects.Text;

    // Overlays
    overlayBg!: Phaser.GameObjects.Rectangle;
    overlayText!: Phaser.GameObjects.Text;
    overlaySubText!: Phaser.GameObjects.Text;

    // State
    currentMaxHP = MAX_HP;
    triforcePieces = 0;
    hasCompass = false;
    totalEnemies = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Create all UI elements.
     */
    create(totalEnemies: number): void {
        this.totalEnemies = totalEnemies;
        this._createHearts();
        this._createEnemyCounter();
        this._createTriforceHUD();
        this._createCompassHUD();
        this._createOverlays();
    }

    /**
     * Create heart HUD.
     */
    private _createHearts(): void {
        const numHearts = Math.ceil(this.currentMaxHP / HEART_HP);
        for (let i = 0; i < numHearts; i++) {
            const heart = this.scene.add.image(20 + i * 28, 20, 'heart_full')
                .setScrollFactor(0)
                .setDepth(100)
                .setScale(1.5);
            this.heartSprites.push(heart);
        }
    }

    /**
     * Create enemy counter text.
     */
    private _createEnemyCounter(): void {
        this.enemyText = this.scene.add.text(
            20, 48,
            `Enemies: ${this.totalEnemies}/${this.totalEnemies}`,
            {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
            },
        ).setScrollFactor(0).setDepth(100);
    }

    /**
     * Create triforce piece HUD.
     */
    private _createTriforceHUD(): void {
        for (let i = 0; i < NUM_TRIFORCE_PIECES; i++) {
            const tx = this.scene.scale.width - 100 + i * 24;
            const tri = this.scene.add.image(tx, 20, 'triforce_hud_empty')
                .setScrollFactor(0)
                .setDepth(100)
                .setScale(1.3);
            this.triforceHudSprites.push(tri);
        }
    }

    /**
     * Create compass HUD and arrow.
     */
    private _createCompassHUD(): void {
        const compassX = this.scene.scale.width - 100 + NUM_TRIFORCE_PIECES * 24 + 8;
        this.compassHudSprite = this.scene.add.image(compassX, 20, 'compass_hud_empty')
            .setScrollFactor(0)
            .setDepth(100)
            .setScale(1.3);

        this.compassArrow = this.scene.add.image(
            this.scene.scale.width / 2, 50, 'compass_arrow'
        ).setScrollFactor(0).setDepth(100).setScale(1.2).setVisible(false);
    }

    /**
     * Create game over/victory overlays.
     */
    private _createOverlays(): void {
        this.overlayBg = this.scene.add.rectangle(512, 384, 1024, 768, 0x000000, 0.6)
            .setScrollFactor(0).setDepth(200).setVisible(false);

        this.overlayText = this.scene.add.text(512, 350, '', {
            fontFamily: 'monospace',
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
        }).setScrollFactor(0).setDepth(201).setOrigin(0.5).setVisible(false);

        this.overlaySubText = this.scene.add.text(512, 420, 'Press R to restart', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#cccccc',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
        }).setScrollFactor(0).setDepth(201).setOrigin(0.5).setVisible(false);
    }

    /**
     * Update hearts based on current HP.
     */
    updateHearts(playerHP: number): void {
        const effectiveMaxHp = this.triforcePieces >= NUM_TRIFORCE_PIECES
            ? TRIFORCE_BONUS_HP
            : MAX_HP;

        for (let i = 0; i < this.heartSprites.length; i++) {
            this.heartSprites[i].setTexture(
                getHeartTexture(playerHP, i, effectiveMaxHp, HEART_HP),
            );
        }
    }

    /**
     * Update enemy counter.
     */
    updateEnemyCounter(remaining: number): void {
        this.enemyText.setText(`Enemies: ${remaining}/${this.totalEnemies}`);
    }

    /**
     * Update triforce HUD display.
     */
    updateTriforce(pieces: number): void {
        this.triforcePieces = pieces;
        for (let i = 0; i < this.triforceHudSprites.length; i++) {
            this.triforceHudSprites[i].setTexture(
                i < pieces ? 'triforce_hud' : 'triforce_hud_empty',
            );
        }
    }

    /**
     * Enable compass (collected from chest).
     */
    enableCompass(): void {
        this.hasCompass = true;
        this.compassArrow.setVisible(true);
        this.compassHudSprite.setTexture('compass_hud');
    }

    /**
     * Update compass arrow to point toward target.
     */
    updateCompassArrow(playerX: number, playerY: number, targetX: number, targetY: number): void {
        if (!this.hasCompass) return;

        const angle = Phaser.Math.Angle.Between(playerX, playerY, targetX, targetY);
        this.compassArrow.setRotation(angle + Math.PI / 2);
        this.compassArrow.setVisible(true);
    }

    /**
     * Hide compass arrow (no enemies left).
     */
    hideCompassArrow(): void {
        this.compassArrow.setVisible(false);
    }

    /**
     * Show flash text when collecting items.
     */
    showFlashText(label: string, color = '#ffd700'): void {
        if (this.chestFlashText) {
            this.chestFlashText.destroy();
        }

        this.chestFlashText = this.scene.add.text(512, 140, label, {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: color,
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
        }).setScrollFactor(0).setDepth(201).setOrigin(0.5);

        this.scene.tweens.add({
            targets: this.chestFlashText,
            y: 100,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                if (this.chestFlashText) {
                    this.chestFlashText.destroy();
                }
            },
        });
    }

    /**
     * Show game over overlay.
     */
    showGameOver(): void {
        this.overlayBg.setVisible(true);
        this.overlayText.setText('Game Over').setVisible(true).setColor('#ff4444');
        this.overlaySubText.setVisible(true);
    }

    /**
     * Show victory overlay with particle effects.
     */
    showVictory(): void {
        this.overlayBg.setVisible(true);
        this.overlayText.setText('Victory!').setVisible(true).setColor('#ffdd44');
        this.overlaySubText.setVisible(true);

        const colors = [0xffdd44, 0xff6644, 0x44ddff, 0x44ff44];
        for (let i = 0; i < 30; i++) {
            this.scene.time.delayedCall(i * 100, () => {
                const cx = Phaser.Math.Between(200, 824);
                const cy = Phaser.Math.Between(200, 568);
                const p = this.scene.add.rectangle(cx, cy, 8, 8,
                    Phaser.Utils.Array.GetRandom(colors), 1,
                ).setScrollFactor(0).setDepth(202);
                this.scene.tweens.add({
                    targets: p,
                    y: cy - 100,
                    alpha: 0,
                    scaleX: 0,
                    scaleY: 0,
                    duration: 1000,
                    onComplete: () => p.destroy(),
                });
            });
        }
    }

    /**
     * Rebuild heart UI for new max HP (triforce bonus).
     */
    rebuildHearts(newMaxHp: number): void {
        this.currentMaxHP = newMaxHp;
        this.heartSprites.forEach((h) => h.destroy());
        this.heartSprites = [];

        const numHearts = Math.ceil(newMaxHp / HEART_HP);
        for (let i = 0; i < numHearts; i++) {
            const heart = this.scene.add.image(20 + i * 28, 20, 'heart_full')
                .setScrollFactor(0).setDepth(100).setScale(1.5);
            this.heartSprites.push(heart);
        }
    }

    /**
     * Flash the camera (for triforce collect).
     */
    flashCamera(duration: number, r: number, g: number, b: number): void {
        this.scene.cameras.main.flash(duration, r, g, b, false);
    }

    /**
     * Shake the camera.
     */
    shakeCamera(duration: number, intensity: number): void {
        this.scene.cameras.main.shake(duration, intensity);
    }

    /**
     * Hide all overlays (for restart).
     */
    hideOverlays(): void {
        this.overlayBg.setVisible(false);
        this.overlayText.setVisible(false);
        this.overlaySubText.setVisible(false);
    }
}
