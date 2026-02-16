import Phaser from 'phaser';
import { generateFallbacks } from '../fallbacks.js';

// ===========================================================================
// StartScene — title / loading screen shown before the game begins.
//
// Introduces the game and teaches the player the mechanics so they can
// jump right in.  Press Space / Enter / tap to start.
// ===========================================================================

export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    // -----------------------------------------------------------------------
    // preload — load the same assets GameScene needs so there's no hitch
    // when we transition.  The textures persist across scenes.
    // -----------------------------------------------------------------------
    preload(): void {
        this.load.on('loaderror', (fileObj: Phaser.Loader.File) => {
            console.warn(`Asset not found: ${fileObj.key} — will use fallback.`);
        });

        this.load.spritesheet('player', 'player_sheet.png', {
            frameWidth: 32, frameHeight: 32,
        });
        this.load.image('grass',              'grass.png');
        this.load.image('tree',               'tree.png');
        this.load.image('rock',               'rock.png');
        this.load.image('goblin',             'goblin.png');
        this.load.image('wizrobe',            'wizrobe.png');
        this.load.image('lynel',              'lynel.png');
        this.load.image('enemy_proj',         'enemy_proj.png');
        this.load.image('heart_full',         'heart_full.png');
        this.load.image('heart_empty',        'heart_empty.png');
        this.load.image('chest_closed',       'chest_closed.png');
        this.load.image('chest_opened',       'chest_opened.png');
        this.load.image('triforce_piece',     'triforce_piece.png');
        this.load.image('triforce_hud',       'triforce_hud.png');
        this.load.image('triforce_hud_empty', 'triforce_hud_empty.png');
    }

    // -----------------------------------------------------------------------
    // create — build the title screen UI
    // -----------------------------------------------------------------------
    create(): void {
        generateFallbacks(this);

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        // Dark background
        this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x111111)
            .setDepth(0);

        // Decorative grass strip behind the content
        this.add.tileSprite(cx, cy, this.scale.width, this.scale.height, 'grass')
            .setAlpha(0.15).setDepth(0);

        // ---- Title ----
        this.add.text(cx, 80, 'Wild Adventure', {
            fontFamily: 'monospace',
            fontSize: '52px',
            color: '#ffdd44',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
        }).setOrigin(0.5).setDepth(1);

        this.add.text(cx, 125, 'A Zelda-like Prototype', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
        }).setOrigin(0.5).setDepth(1);

        // ---- How to play section ----
        const sectionY = 175;
        this.add.text(cx, sectionY, '— How to Play —', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
        }).setOrigin(0.5).setDepth(1);

        // Controls & mechanics — two columns: keyboard | mobile
        const colLeft  = cx - 160;
        const colRight = cx + 160;
        const lineH = 26;
        const blockStartY = sectionY + 32;

        // Column headers
        this.add.text(colLeft, blockStartY, '⌨️  Keyboard', {
            fontFamily: 'monospace', fontSize: '14px',
            color: '#88aaff', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0.5).setDepth(1);

        this.add.text(colRight, blockStartY, '📱  Mobile / Touch', {
            fontFamily: 'monospace', fontSize: '14px',
            color: '#88aaff', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0.5).setDepth(1);

        const kbLines = [
            'WASD / Arrows to move',
            'Space to attack',
        ];
        const touchLines = [
            'Drag left side to move',
            'Tap right side to attack',
        ];

        kbLines.forEach((txt, i) => {
            this.add.text(colLeft, blockStartY + (i + 1) * lineH, txt, {
                fontFamily: 'monospace', fontSize: '13px',
                color: '#cccccc', stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5, 0.5).setDepth(1);
        });

        touchLines.forEach((txt, i) => {
            this.add.text(colRight, blockStartY + (i + 1) * lineH, txt, {
                fontFamily: 'monospace', fontSize: '13px',
                color: '#cccccc', stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5, 0.5).setDepth(1);
        });

        // Shared goal lines (centered, below both columns)
        const goalY = blockStartY + (Math.max(kbLines.length, touchLines.length) + 1) * lineH + 6;
        const goalLines = [
            { icon: '💛', text: 'Walk into chests to collect Triforce pieces' },
            { icon: '✦',  text: 'Collect all 3 pieces → HP upgraded to 8 hearts!' },
            { icon: '👾', text: 'Defeat all enemies to win' },
        ];
        goalLines.forEach((line, i) => {
            const y = goalY + i * lineH;
            this.add.text(cx - 190, y, line.icon, {
                fontFamily: 'monospace', fontSize: '16px',
            }).setOrigin(0, 0.5).setDepth(1);
            this.add.text(cx - 164, y, line.text, {
                fontFamily: 'monospace', fontSize: '13px',
                color: '#cccccc', stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0, 0.5).setDepth(1);
        });

        // ---- Enemy bestiary (vertical rows — no overlap) ----
        const bestiaryY = goalY + goalLines.length * lineH + 16;
        this.add.text(cx, bestiaryY, '— Enemies —', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
        }).setOrigin(0.5).setDepth(1);

        const enemies = [
            { key: 'goblin',  label: 'Goblin',  desc: '— fast melee, 1 hit kill' },
            { key: 'wizrobe', label: 'Wizrobe', desc: '— shoots magic orbs, 1 hit kill' },
            { key: 'lynel',   label: 'Lynel',   desc: '— slow tank, takes 3 hits' },
        ];

        const enemyRowH = 30;
        const enemyStartY = bestiaryY + 26;
        const spriteX = cx - 160;

        enemies.forEach((e, i) => {
            const ey = enemyStartY + i * enemyRowH;

            const sprite = this.add.image(spriteX, ey, e.key)
                .setDepth(2).setScale(0.9);

            // Gentle bob
            this.tweens.add({
                targets: sprite,
                y: ey - 2,
                duration: 1000 + i * 200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            this.add.text(spriteX + 22, ey, e.label, {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ff8888',
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0, 0.5).setDepth(1);

            this.add.text(spriteX + 100, ey, e.desc, {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#999999',
                stroke: '#000000',
                strokeThickness: 1,
            }).setOrigin(0, 0.5).setDepth(1);
        });

        // ---- Chest + triforce teaser ----
        const chestY = enemyStartY + enemies.length * enemyRowH + 14;
        const chestSprite = this.add.image(cx - 60, chestY, 'chest_closed')
            .setDepth(2).setScale(1.3);
        this.tweens.add({
            targets: chestSprite,
            y: chestY - 3,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        const triSprite = this.add.image(cx + 4, chestY, 'triforce_piece')
            .setDepth(2).setScale(1.6);
        this.tweens.add({
            targets: triSprite,
            y: chestY - 4,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this.add.text(cx + 30, chestY, 'Find 3 chests → Complete the Triforce!', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0, 0.5).setDepth(1);

        // ---- "Press to start" prompt ----
        const promptY = this.scale.height - 50;
        const prompt = this.add.text(cx, promptY, '[ Press SPACE / ENTER or Tap to start ]', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
        }).setOrigin(0.5).setDepth(1);

        // Pulsing prompt
        this.tweens.add({
            targets: prompt,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // ---- Input bindings ----
        // @ts-expect-error Phaser addKey interop
        const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)!;
        // @ts-expect-error Phaser addKey interop
        const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)!;

        const startGame = () => {
            this.scene.start('GameScene');
        };

        spaceKey.on('down', startGame);
        enterKey.on('down', startGame);
        this.input.on('pointerdown', startGame);
    }
}