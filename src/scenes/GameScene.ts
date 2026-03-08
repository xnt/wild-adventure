import Phaser from 'phaser';
import {
    TILE_SIZE, MAP_COLS, MAP_ROWS,
    MAX_HP, HEART_HP, NUM_ENEMIES,
    FRAMES as F,
    NUM_TRIFORCE_PIECES, TRIFORCE_BONUS_HP,
} from '../constants.js';
import { mapData, chestPositions, structurePlacements } from '../map.js';
import { generateFallbacks } from '../fallbacks/index.js';
import { buildTilemap } from '../gameSceneUtils.js';

// Systems
import {
    PlayerController,
    CombatSystem,
    EnemySystem,
    UISystem,
    CollectiblesSystem,
} from '../systems/index.js';

// ===========================================================================
// GameScene — orchestrates game systems (player, combat, enemies, UI, collectibles)
// ===========================================================================

export default class GameScene extends Phaser.Scene {
    // Systems
    playerController!: PlayerController;
    combatSystem!: CombatSystem;
    enemySystem!: EnemySystem;
    uiSystem!: UISystem;
    collectiblesSystem!: CollectiblesSystem;

    // World
    obstacleLayer!: Phaser.Physics.Arcade.StaticGroup;

    // Input
    restartKey!: Phaser.Input.Keyboard.Key;

    // Game state
    gameOver = false;
    victory = false;

    constructor() {
        super({ key: 'GameScene' });
    }

    // -----------------------------------------------------------------------
    // init — called on every restart; reset all mutable state
    // -----------------------------------------------------------------------
    init(): void {
        this.gameOver = false;
        this.victory = false;
    }

    // -----------------------------------------------------------------------
    // preload — attempt to load real PNGs; fallbacks generated in create()
    // -----------------------------------------------------------------------
    preload(): void {
        this.load.on('loaderror', (fileObj: Phaser.Loader.File) => {
            // Asset not found — will use fallback
        });

        this.load.spritesheet('player', 'player_sheet.png', {
            frameWidth: 32, frameHeight: 32,
        });
        this.load.image('grass', 'grass.png');
        this.load.image('forest', 'forest.png');
        this.load.image('swamp', 'swamp.png');
        this.load.image('snow', 'snow.png');
        this.load.image('tree', 'tree.png');
        this.load.image('rock', 'rock.png');

        // Enemy variety
        this.load.image('goblin', 'goblin.png');
        this.load.image('wizrobe', 'wizrobe.png');
        this.load.image('lynel', 'lynel.png');
        this.load.image('gel', 'gel.png');
        this.load.image('enemy_proj', 'enemy_proj.png');

        this.load.image('heart_full', 'heart_full.png');
        this.load.image('heart_empty', 'heart_empty.png');

        // Chest / triforce assets
        this.load.image('chest_closed', 'chest_closed.png');
        this.load.image('chest_opened', 'chest_opened.png');
        this.load.image('triforce_piece', 'triforce_piece.png');
        this.load.image('triforce_hud', 'triforce_hud.png');
        this.load.image('triforce_hud_empty', 'triforce_hud_empty.png');

        // Compass assets
        this.load.image('compass', 'compass.png');
        this.load.image('compass_hud', 'compass_hud.png');
        this.load.image('compass_hud_empty', 'compass_hud_empty.png');
        this.load.image('compass_arrow', 'compass_arrow.png');

        // Decorative structures
        this.load.image('pyramid', 'pyramid.png');
        this.load.image('totem', 'totem.png');
        this.load.image('teepee', 'teepee.png');
        this.load.image('castle', 'castle.png');
        this.load.image('temple_time', 'temple_time.png');
        this.load.image('stonehenge', 'stonehenge.png');
        this.load.image('cabin', 'cabin.png');
    }

    // -----------------------------------------------------------------------
    // create — build world, initialize systems
    // -----------------------------------------------------------------------
    create(): void {
        generateFallbacks(this);

        // Build world
        this._buildTilemap();
        this._createStructures();

        // Initialize systems
        this._initSystems();

        // Camera
        const playerPos = this.playerController.getPosition();
        this.cameras.main.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
        this.cameras.main.startFollow(this.playerController.player, true, 0.15, 0.15);

        // Input
        // @ts-expect-error Phaser addKey interop
        this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)!;

        // Touch controls
        this._setupTouchControls();
    }

    // -----------------------------------------------------------------------
    // Initialize all game systems
    // -----------------------------------------------------------------------
    _initSystems(): void {
        const startX = Math.floor(MAP_COLS / 2) * TILE_SIZE + TILE_SIZE / 2;
        const startY = Math.floor(MAP_ROWS / 2) * TILE_SIZE + TILE_SIZE / 2;

        // Player Controller
        this.playerController = new PlayerController(this);
        this.playerController.initInput();
        this.playerController.createAnimations(F);
        this.playerController.createPlayer(startX, startY, F.IDLE_S);
        this.playerController.setHP(MAX_HP);
        this.playerController.onDeath = () => this._showGameOver();

        // Enemy System
        this.enemySystem = new EnemySystem(this);
        this.enemySystem.init(this.obstacleLayer);
        this.enemySystem.createEnemies(mapData, startX, startY);
        this.enemySystem.setupPlayerCollisions(this.playerController.player);
        this.enemySystem.onPlayerHitByEnemy = (enemy) => {
            this.playerController.takeDamage(enemy, this.time.now);
        };
        this.enemySystem.onPlayerHitByProjectile = (proj) => {
            this.playerController.takeDamage(proj, this.time.now);
        };
        this.enemySystem.onEnemyKilled = () => this._checkVictory();

        // Colliders: player & obstacles, enemies & obstacles
        this.physics.add.collider(this.playerController.player, this.obstacleLayer);
        this.physics.add.collider(this.enemySystem.getEnemies(), this.obstacleLayer);

        // Heart pickup collision
        this.physics.add.overlap(
            this.playerController.player,
            this.enemySystem.getHeartDrops(),
            (_p, heart) => {
                const effectiveMax = this.collectiblesSystem.getTriforcePieces() >= NUM_TRIFORCE_PIECES
                    ? TRIFORCE_BONUS_HP
                    : MAX_HP;
                this.playerController.heal(HEART_HP, effectiveMax);
                (heart as Phaser.Physics.Arcade.Sprite).destroy();
            },
            undefined,
            this,
        );

        // Combat System
        this.combatSystem = new CombatSystem(this);
        const swordGroup = this.combatSystem.createSwordGroup();
        this.combatSystem.init(swordGroup, this.enemySystem.getEnemies());
        this.combatSystem.onAttackStart = () => {
            this.playerController.setAttacking(true);
            this.playerController.stop();
            this.playerController.playAttack();
        };
        this.combatSystem.onAttackEnd = () => {
            this.playerController.setAttacking(false);
            this.playerController.playIdle();
        };
        this.combatSystem.onEnemyHit = (enemy) => {
            this.enemySystem.damageEnemy(enemy);
        };

        // UI System
        this.uiSystem = new UISystem(this);
        this.uiSystem.create(NUM_ENEMIES);

        // Collectibles System
        this.collectiblesSystem = new CollectiblesSystem(this);
        this.collectiblesSystem.createChests(chestPositions);
        this.collectiblesSystem.onTriforceCollected = (pieceIndex) => {
            this.uiSystem.updateTriforce(pieceIndex);
        };
        this.collectiblesSystem.onTriforceComplete = () => {
            this._onTriforceComplete();
        };
        this.collectiblesSystem.onCompassCollected = () => {
            this.uiSystem.enableCompass();
        };
    }

    // -----------------------------------------------------------------------
    // update — game loop: orchestrate systems
    // -----------------------------------------------------------------------
    update(time: number, _delta: number): void {
        if (this.gameOver || this.victory) {
            if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
                this.scene.restart();
            }
            return;
        }

        // Update player
        this.playerController.update(time);

        // Update combat (check for attack input)
        const playerPos = this.playerController.getPosition();
        const justPressed = Phaser.Input.Keyboard.JustDown(this.playerController.spaceKey)
            || this.playerController.consumeTouchAttack();
        this.combatSystem.update(
            time,
            playerPos.x,
            playerPos.y,
            this.playerController.getFacing(),
            justPressed,
        );

        // Update enemies
        this.enemySystem.update(time, playerPos);

        // Update collectibles (chest proximity check)
        this.collectiblesSystem.update(playerPos.x, playerPos.y);

        // Update UI
        this._updateUI();
    }

    // -----------------------------------------------------------------------
    // World building
    // -----------------------------------------------------------------------
    _buildTilemap(): void {
        this.obstacleLayer = buildTilemap(
            this, mapData, TILE_SIZE, MAP_COLS, MAP_ROWS,
        );
    }

    _createStructures(): void {
        for (const placement of structurePlacements) {
            const { config, x, y } = placement;
            const centerX = x + (config.width * TILE_SIZE) / 2;
            const centerY = y + (config.height * TILE_SIZE) / 2;

            const structure = this.add.image(centerX, centerY, config.key);
            structure.setDepth(2);
        }
    }

    // -----------------------------------------------------------------------
    // UI Updates
    // -----------------------------------------------------------------------
    _updateUI(): void {
        const playerHP = this.playerController.getHP();
        this.uiSystem.updateHearts(playerHP);

        const remaining = this.enemySystem.getRemaining();
        this.uiSystem.updateEnemyCounter(remaining);

        // Compass arrow
        if (this.collectiblesSystem.getHasCompass()) {
            const livingEnemies = this.enemySystem.getLivingEnemies();
            if (livingEnemies.length > 0) {
                // Find closest enemy
                let closest = livingEnemies[0];
                let closestDist = Infinity;
                const playerPos = this.playerController.getPosition();

                for (const enemy of livingEnemies) {
                    const dist = Phaser.Math.Distance.Between(
                        playerPos.x, playerPos.y, enemy.x, enemy.y,
                    );
                    if (dist < closestDist) {
                        closestDist = dist;
                        closest = enemy;
                    }
                }

                this.uiSystem.updateCompassArrow(
                    playerPos.x, playerPos.y, closest.x, closest.y,
                );
            } else {
                this.uiSystem.hideCompassArrow();
            }
        }

        // Check victory
        if (remaining <= 0 && !this.victory) {
            this._showVictory();
        }
    }

    // -----------------------------------------------------------------------
    // Game over / victory
    // -----------------------------------------------------------------------
    _showGameOver(): void {
        this.gameOver = true;
        this.playerController.stop();
        this.playerController.player.setTint(0x666666);
        this.uiSystem.showGameOver();
    }

    _showVictory(): void {
        this.victory = true;
        this.playerController.stop();
        this.uiSystem.showVictory();
    }

    _checkVictory(): void {
        // Victory check happens in _updateUI via remaining count
    }

    // -----------------------------------------------------------------------
    // Triforce complete
    // -----------------------------------------------------------------------
    _onTriforceComplete(): void {
        // Upgrade HP to 8 hearts
        this.playerController.setHP(TRIFORCE_BONUS_HP);

        // Rebuild heart HUD
        this.uiSystem.rebuildHearts(TRIFORCE_BONUS_HP);

        // Camera effects
        this.uiSystem.flashCamera(600, 255, 255, 100);
        this.uiSystem.shakeCamera(200, 0.015);

        // Show flash text
        this.uiSystem.showFlashText('✦ Triforce Complete! HP upgraded! ✦');
    }

    // -----------------------------------------------------------------------
    // Touch controls
    // -----------------------------------------------------------------------
    _setupTouchControls(): void {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.x > this.scale.width * 0.7) {
                this.playerController.setTouchAttack(true);
            }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown && pointer.x <= this.scale.width * 0.7) {
                const dx = pointer.x - pointer.downX;
                const dy = pointer.y - pointer.downY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 10) {
                    this.playerController.setTouchDir(dx / dist, dy / dist);
                } else {
                    this.playerController.setTouchDir(0, 0);
                }
            }
        });

        this.input.on('pointerup', () => {
            this.playerController.setTouchDir(0, 0);
            this.playerController.setTouchAttack(false);
        });
    }
}
