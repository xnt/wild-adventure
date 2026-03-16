import Phaser from 'phaser';
import {
    TILE_SIZE, MAP_COLS, MAP_ROWS,
    MAX_HP, NUM_ENEMIES,
    FRAMES as F,
    NUM_TRIFORCE_PIECES, TRIFORCE_BONUS_HP,
} from '../constants.js';
import { mapData, chestPositions, structurePlacements } from '../map.js';
import { generateFallbacks } from '../fallbacks/index.js';
import { WorldFactory, WorldData } from '../worldFactory.js';
import type { PlayerIntent, GameEnemy } from '../types.js';

// Systems
import {
    PlayerController,
    CombatSystem,
    EnemySystem,
    UISystem,
    CollectibleSystem,
    KeyboardInputSource,
    TouchInputSource,
    CompositeInputSource,
    EventBus,
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
    collectibleSystem!: CollectibleSystem;

    // Event Bus
    eventBus!: EventBus;

    // Input
    inputSource!: CompositeInputSource;
    keyboardSource!: KeyboardInputSource;
    restartKey!: Phaser.Input.Keyboard.Key;

    // World
    worldFactory!: WorldFactory;
    worldData!: WorldData;
    obstacleLayer!: Phaser.Physics.Arcade.StaticGroup;
    waterLayer!: Phaser.Physics.Arcade.StaticGroup;
    waterCollider?: Phaser.Physics.Arcade.Collider;

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
        this.load.image('water', 'water.png');
        this.load.image('bridge', 'bridge.png');

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

        // Snorkel assets
        this.load.image('snorkel', 'snorkel.png');
        this.load.image('snorkel_hud', 'snorkel_hud.png');
        this.load.image('snorkel_hud_empty', 'snorkel_hud_empty.png');

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

        // World Factory
        this.worldFactory = new WorldFactory(this);
        this.worldData = {
            map: mapData,
            chests: chestPositions,
            structures: structurePlacements,
        };

        // Build world
        const layers = this.worldFactory.buildWorld(this.worldData);
        this.obstacleLayer = layers.obstacleLayer;
        this.waterLayer = layers.waterLayer;

        // Initialize systems
        this._initSystems();

        // Camera
        const playerPos = this.playerController.getPosition();
        this.cameras.main.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
        this.cameras.main.startFollow(this.playerController.player, true, 0.15, 0.15);

        // Input
        // @ts-expect-error Phaser addKey interop
        this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)!;
    }

    // -----------------------------------------------------------------------
    // Initialize all game systems
    // -----------------------------------------------------------------------
    _initSystems(): void {
        const startX = Math.floor(MAP_COLS / 2) * TILE_SIZE + TILE_SIZE / 2;
        const startY = Math.floor(MAP_ROWS / 2) * TILE_SIZE + TILE_SIZE / 2;

        // Event Bus (central pub/sub for system communication)
        this.eventBus = new EventBus();
        this._setupEventSubscriptions();

        // Input sources (device-agnostic intent generation)
        this.keyboardSource = new KeyboardInputSource(this);
        const touchSource = new TouchInputSource(this);
        this.inputSource = new CompositeInputSource([this.keyboardSource, touchSource]);

        // Player Controller
        this.playerController = new PlayerController(this, this.eventBus);
        this.playerController.createAnimations(F);
        this.playerController.createPlayer(startX, startY, F.IDLE_S);
        this.playerController.setHP(MAX_HP);

        // UI System
        this.uiSystem = new UISystem(this);
        this.uiSystem.create(NUM_ENEMIES);

        // Collectible System
        this.collectibleSystem = new CollectibleSystem(this, this.eventBus);
        this.collectibleSystem.createChests(chestPositions);

        // Enemy System
        this.enemySystem = new EnemySystem(this, this.eventBus);
        this.enemySystem.init(this.obstacleLayer, this.waterLayer, this.collectibleSystem);
        this.enemySystem.createEnemies(this.worldFactory, mapData, startX, startY);
        this.enemySystem.setupPlayerCollisions(this.playerController.player);

        // Colliders: player & obstacles, enemies & obstacles
        this.physics.add.collider(this.playerController.player, this.obstacleLayer);
        this.physics.add.collider(this.enemySystem.getEnemies(), this.obstacleLayer);

        // Water collider (only if no snorkel)
        this.waterCollider = this.physics.add.collider(this.playerController.player, this.waterLayer);

        // Enemies always collide with water (except Octoroks which are in it)
        this.physics.add.collider(this.enemySystem.getEnemies(), this.waterLayer, (enemy) => {
            // Octoroks are intended to be in water, don't collide them
            const e = enemy as GameEnemy;
            if (e.type === 'octorok') {
                return false;
            }
            return true;
        }, (enemy) => {
            const e = enemy as GameEnemy;
            return e.type !== 'octorok';
        });

        // Collectible pickup collision
        this.collectibleSystem.setupPlayerCollisions(this.playerController.player);

        // Combat System
        this.combatSystem = new CombatSystem(this, this.eventBus);
        const swordGroup = this.combatSystem.createSwordGroup();
        this.combatSystem.init(swordGroup, this.enemySystem.getEnemies());
    }

    // -----------------------------------------------------------------------
    // Event Bus Subscriptions
    // -----------------------------------------------------------------------
    _setupEventSubscriptions(): void {
        // Player events
        this.eventBus.on('player:died', () => {
            this._showGameOver();
        });

        // Combat events
        this.eventBus.on('combat:attackStarted', () => {
            this.playerController.setAttacking(true);
            this.playerController.stop();
            this.playerController.playAttack();
        });
        this.eventBus.on('combat:attackEnded', () => {
            this.playerController.setAttacking(false);
            this.playerController.playIdle();
        });
        this.eventBus.on('combat:enemyHit', ({ enemy }) => {
            this.enemySystem.damageEnemy(enemy);
        });

        // Enemy events
        this.eventBus.on('enemy:playerHit', ({ enemy }) => {
            this.playerController.takeDamage(enemy, this.time.now);
        });
        this.eventBus.on('enemy:projectileHit', ({ projectile }) => {
            this.playerController.takeDamage(projectile, this.time.now);
        });
        this.eventBus.on('enemy:killed', () => {
            this._checkVictory();
        });

        // Collectible events
        this.eventBus.on('collectible:triforceCollected', ({ pieceIndex }) => {
            this.uiSystem.updateTriforce(pieceIndex);
        });
        this.eventBus.on('collectible:triforceComplete', () => {
            this._onTriforceComplete();
        });
        this.eventBus.on('collectible:compassCollected', () => {
            this.uiSystem.enableCompass();
        });
        this.eventBus.on('collectible:snorkelCollected', () => {
            this._onSnorkelCollected();
        });
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

        // Update input sources (consumes one-shot events like attack)
        this.inputSource.update();

        // Get unified intent from all input sources
        const intent = this.inputSource.getIntent();

        // Update player with intent
        const playerPos = this.playerController.getPosition();
        this._updatePlayerBiome(playerPos.x, playerPos.y);
        this.playerController.update(time, intent);

        // Update combat (check for attack intent)
        this.combatSystem.update(
            time,
            playerPos.x,
            playerPos.y,
            this.playerController.getFacing(),
            intent.attack,
        );

        // Update enemies
        this.enemySystem.update(time, playerPos);

        // Update collectibles (chest proximity check)
        this.collectibleSystem.update(playerPos.x, playerPos.y);

        // Update UI
        this._updateUI();
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
        if (this.collectibleSystem.getHasCompass()) {
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

    _onSnorkelCollected(): void {
        if (this.waterCollider) {
            this.waterCollider.active = false;
        }
        this.uiSystem.enableSnorkel();
        this.uiSystem.showFlashText('✦ Snorkel Collected! You can now swim! ✦');
    }

    /**
     * Detect biome under player and update controller physics.
     */
    _updatePlayerBiome(x: number, y: number): void {
        const col = Math.floor(x / TILE_SIZE);
        const row = Math.floor(y / TILE_SIZE);

        if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) {
            const tileType = this.worldData.map[row][col];
            this.playerController.setBiome(tileType);
        }
    }
}
