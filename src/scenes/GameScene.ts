import Phaser from 'phaser';
import {
    TILE_SIZE, MAP_COLS, MAP_ROWS,
    PLAYER_SPEED, ENEMY_SPEED, CHASE_RANGE,
    ATTACK_RANGE, ATTACK_DUR, ATTACK_CD,
    MAX_HP, HEART_HP, ENEMY_DMG, NUM_ENEMIES,
    IFRAMES_DUR, FRAMES as F,
    // Enemy variety
    ENEMY_CONFIGS, PROJ_LIFETIME,
    // Chest / triforce
    NUM_CHESTS, CHEST_CONTENTS, CHEST_INTERACT_RANGE,
    TRIFORCE_BONUS_HP,
} from '../constants';
import { mapData, chestPositions } from '../map';
import { generateFallbacks } from '../fallbacks';
// Shared types (centralized in types.ts for DRY; no circular imports).
// GameEnemy uses intersection for Phaser compat; PhysicsCallbackObject union
// ensures callback assignability.
import type {
    TouchDir,
    GameEnemy,
    GameChest,
    PhysicsCallbackObject,
    PositionedObject,
    EnemyConfig,  // Re-exported from constants
} from '../types';
// Non-UI utils (extracted for readability/testability: effects/math calcs, AI, spawn).
// Relative path from scenes/ dir.
import {
    createSlashEffect,
    createDeathEffect,
    calcProjectileParams,
    calcKnockbackVelocity,
    updateEnemies,
    // New pure extracts for testability (movement/attack/UI/damage calcs; no render/side-effect).
    // Delegates ensure identical public behavior (e.g., _handlePlayerMovement wraps getFacingFromVelocity).
    // Behavior-focused: test contracts like "vel -> facing", avoid impl.
    getFacingFromVelocity,
    calcNormalizedVelocity,
    getAnimKey,
    calcAttackOffset,
    getSwordDimensions,
    isAttackReady,
    calcIframesAlpha,
    getHeartTexture,
    getRemainingEnemies,
    getValidEnemySpawn,
    // createEnemies, buildTilemap: stubs now complete below in this iteration (full extract).
    createEnemies,
    buildTilemap,
} from '../gameSceneUtils';

// ===========================================================================
// GameScene — the single scene that runs the entire game
// ===========================================================================

export default class GameScene extends Phaser.Scene {
    // Declare class properties with Phaser types for strict checking/definite assignment.
    // (Properties are initialized in init()/create(); ! postfix asserts non-null.)
    player!: Phaser.Physics.Arcade.Sprite;
    enemies!: Phaser.Physics.Arcade.Group;
    enemyProjectiles!: Phaser.Physics.Arcade.Group;
    heartDrops!: Phaser.Physics.Arcade.Group;
    swordGroup!: Phaser.Physics.Arcade.Group;
    obstacleLayer!: Phaser.Physics.Arcade.StaticGroup;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    // Specific shape for WASD (guarantees keys present/non-null; fixes possible-null
    // TS error on .left etc. accesses).
    wasd!: {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };
    spaceKey!: Phaser.Input.Keyboard.Key;
    restartKey!: Phaser.Input.Keyboard.Key;
    heartSprites: Phaser.GameObjects.Image[] = [];
    enemyText!: Phaser.GameObjects.Text;
    overlayBg!: Phaser.GameObjects.Rectangle;
    overlayText!: Phaser.GameObjects.Text;
    overlaySubText!: Phaser.GameObjects.Text;
    playerHP!: number;
    facing!: 'up' | 'down' | 'left' | 'right';
    isAttacking!: boolean;
    lastAttackTime!: number;
    lastHitTime!: number;
    enemiesKilled!: number;
    gameOver!: boolean;
    victory!: boolean;
    touchDir: TouchDir = { x: 0, y: 0 };
    touchAttack!: boolean;

    // Chest / triforce state
    chests: GameChest[] = [];
    triforcePieces!: number;          // count of collected pieces (0-3)
    triforceHudSprites: Phaser.GameObjects.Image[] = [];
    chestFlashText!: Phaser.GameObjects.Text;  // brief label when opening a chest

    constructor() {
        super({ key: 'GameScene' });
    }

    // -----------------------------------------------------------------------
    // init — called on every restart; reset all mutable state
    // -----------------------------------------------------------------------
    init(): void {
        this.playerHP       = MAX_HP;
        this.facing         = 'down';
        this.isAttacking    = false;
        this.lastAttackTime = 0;
        this.lastHitTime    = 0;
        this.enemiesKilled  = 0;
        this.gameOver       = false;
        this.victory        = false;
        this.triforcePieces = 0;
    }

    // -----------------------------------------------------------------------
    // preload — attempt to load real PNGs; fallbacks generated in create()
    // -----------------------------------------------------------------------
    preload(): void {
        // loaderror event: typed param (Phaser.Loader.File) to eliminate implicit any.
        this.load.on('loaderror', (fileObj: Phaser.Loader.File) => {
            console.warn(`Asset not found: ${fileObj.key} — will use fallback.`);
        });

        this.load.spritesheet('player', 'player_sheet.png', {
            frameWidth: 32, frameHeight: 32,
        });
        this.load.image('grass',       'grass.png');
        this.load.image('tree',        'tree.png');
        this.load.image('rock',        'rock.png');

        // Enemy variety (Goblin pattern; fallbacks ensure no sprites needed)
        this.load.image('goblin',      'goblin.png');
        this.load.image('wizrobe',     'wizrobe.png');  // shoots slow projectiles
        this.load.image('lynel',       'lynel.png');    // slow, 3-hit tank
        this.load.image('enemy_proj',  'enemy_proj.png'); // Wizrobe projectile

        this.load.image('heart_full',  'heart_full.png');
        this.load.image('heart_empty', 'heart_empty.png');

        // Chest / triforce assets (fallbacks generated if PNGs missing)
        this.load.image('chest_closed',      'chest_closed.png');
        this.load.image('chest_opened',      'chest_opened.png');
        this.load.image('triforce_piece',    'triforce_piece.png');
        this.load.image('triforce_hud',      'triforce_hud.png');
        this.load.image('triforce_hud_empty', 'triforce_hud_empty.png');
    }

    // -----------------------------------------------------------------------
    // create — build world, player, enemies, UI
    // -----------------------------------------------------------------------
    create(): void {
        generateFallbacks(this);

        this._buildTilemap();
        this._createPlayer();
        this._createEnemies();
        this._createChests();

        this.swordGroup = this.physics.add.group();

        // Collisions
        // Player & obstacles
        this.physics.add.collider(this.player, this.obstacleLayer);
        // Enemies & obstacles (can't pass trees/rocks)
        this.physics.add.collider(this.enemies, this.obstacleLayer);
        // Enemy projectiles collide with obstacles & destroy on hit
        // Callbacks use PhysicsCallbackObject (Phaser union) for exact sig match to
        // ArcadePhysicsCallback (fixes assignability; no implicit any).
        // Assert/cast inside for GameEnemy/Positioned where custom props needed.
        // undefined for process cb (vs null).
        this.physics.add.collider(
            this.enemyProjectiles, this.obstacleLayer,
            (proj: PhysicsCallbackObject) => (proj as Phaser.Physics.Arcade.Sprite).destroy(),
            undefined,
            this,
        );

        // Sword attacks vs enemies (persistent group overlap -- fixes accumulation
        // bug from per-attack registration; ensures single _damageEnemy call per hit,
        // so Lynels now properly take 3 hits, etc.)
        // Fix for multi-hit per swing (per debug: overlap fired 3x instantly on 1 attack,
        // decrementing HP 3->0). Destroy sword immediately on hit to enforce 1 damage/swing.
        // Simple console debug retained; processCallback kept for extra safety.
        //
        // Callbacks use PhysicsCallbackObject for union compat/inheritance.
        // Assert enemy to GameEnemy for custom props (type/hp/isDying/active);
        // _s to Sprite for destroy. Delegates to typed _damageEnemy.
        this.physics.add.overlap(
            this.swordGroup, this.enemies,
            (_s: PhysicsCallbackObject, enemy: PhysicsCallbackObject) => {
                // Simple debug: log Lynel sword overlap to console (should fire once/swing now).
                // Cast for GameEnemy props (intersection ensures safety).
                const enemyTyped = enemy as GameEnemy;
                if (enemyTyped.type === 'lynel') {
                    console.log(`Sword overlap hit Lynel! Pre-damage HP=${enemyTyped.hp}, dying=${!!enemyTyped.isDying}, active=${enemyTyped.active}`);
                }
                this._damageEnemy(enemyTyped);
                // Destroy sword on hit...
                (_s as Phaser.Physics.Arcade.Sprite).destroy();
            },
            // processCallback: only process if not dying (1 hit/sword safety).
            // Cast for GameEnemy; boolean return.
            (_s: PhysicsCallbackObject, enemy: PhysicsCallbackObject) => !(enemy as GameEnemy).isDying,
            this,
        );
        // Player-enemy touch damage
        // Bound method (now typed to union cb obj); undefined process.
        this.physics.add.overlap(
            this.player, this.enemies, this._onPlayerHit, undefined, this,
        );
        // Wizrobe projectile damage (slow orbs)
        this.physics.add.overlap(
            this.player, this.enemyProjectiles, this._onPlayerHitByProj,
            undefined, this,
        );

        // Camera
        this.cameras.main.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
        this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

        // Input
        // Phaser input APIs (createCursorKeys/addKeys/addKey) have loose TS defs causing
        // possibly-null errors (absolute interop case for keyboard plugin).
        // @ts-expect-error on assigns below ONLY; suppresses without 'any' or loose config.
        // No implicit any elsewhere; types inherit correctly via class props.
        // (Build/dev unaffected; Phaser runtime guarantees objects.)
        this.cursors    = this.input.keyboard.createCursorKeys()!;
        // @ts-expect-error Phaser addKeys interop
        this.wasd       = this.input.keyboard.addKeys({
            up:    Phaser.Input.Keyboard.KeyCodes.W,
            down:  Phaser.Input.Keyboard.KeyCodes.S,
            left:  Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        }) as {
            up: Phaser.Input.Keyboard.Key;
            down: Phaser.Input.Keyboard.Key;
            left: Phaser.Input.Keyboard.Key;
            right: Phaser.Input.Keyboard.Key;
        };
        // @ts-expect-error Phaser addKey interop
        this.spaceKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)!;
        // @ts-expect-error Phaser addKey interop
        this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)!;

        this._createUI();
        this._setupTouchControls();

        console.log('Wild Adventure loaded! WASD/Arrows to move, Space to attack.');
    }

    // -----------------------------------------------------------------------
    // update — game loop
    // -----------------------------------------------------------------------
    // Override with typed params (per Phaser.Scene).
    update(time: number, _delta: number): void {
        if (this.gameOver || this.victory) {
            if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
                this.scene.restart();
            }
            return;
        }

        this._handlePlayerMovement(time);
        this._handleAttack(time);
        this._updateEnemies(time);
        this._checkChests();
        this._updateUI();
    }

    // =======================================================================
    // WORLD
    // =======================================================================

    // _buildTilemap: static obstacles; obs from group create has body.
    // Delegates to utils.buildTilemap (extracted tile loop/pure isObstacle; tileSprite/bounds delegated).
    // Behavior identical; returns layer for collider assign.
    _buildTilemap(): void {
        // Call extracted; mapData from import, consts.
        this.obstacleLayer = buildTilemap(
            this, mapData, TILE_SIZE, MAP_COLS, MAP_ROWS,
        );
    }

    // =======================================================================
    // PLAYER
    // =======================================================================

    // _createPlayer: typed; body! for physics sprite.
    _createPlayer(): void {
        const startX = Math.floor(MAP_COLS / 2) * TILE_SIZE + TILE_SIZE / 2;
        const startY = Math.floor(MAP_ROWS / 2) * TILE_SIZE + TILE_SIZE / 2;

        this.player = this.physics.add.sprite(startX, startY, 'player', F.IDLE_S);
        this.player.setDepth(5);
        this.player.setCollideWorldBounds(true);
        // body! : non-null post-physics add.
        this.player.body!.setSize(20, 22);
        this.player.body!.setOffset(6, 8);

        // Create animations only once (they survive scene restarts)
        if (!this.anims.exists('idle_up')) {
            this.anims.create({ key: 'idle_up',    frames: [{ key: 'player', frame: F.IDLE_N }], frameRate: 1 });
            this.anims.create({ key: 'idle_down',  frames: [{ key: 'player', frame: F.IDLE_S }], frameRate: 1 });
            this.anims.create({ key: 'idle_right', frames: [{ key: 'player', frame: F.IDLE_E }], frameRate: 1 });
            this.anims.create({ key: 'idle_left',  frames: [{ key: 'player', frame: F.IDLE_W }], frameRate: 1 });

            this.anims.create({
                key: 'walk_down',
                frames: [{ key: 'player', frame: F.WALK_S1 }, { key: 'player', frame: F.WALK_S2 }],
                frameRate: 8, repeat: -1,
            });
            this.anims.create({
                key: 'walk_right',
                frames: [{ key: 'player', frame: F.WALK_E1 }, { key: 'player', frame: F.WALK_E2 }],
                frameRate: 8, repeat: -1,
            });
            this.anims.create({
                key: 'walk_up',
                frames: [{ key: 'player', frame: F.WALK_N1 }, { key: 'player', frame: F.WALK_N2 }],
                frameRate: 8, repeat: -1,
            });
            this.anims.create({
                key: 'walk_left',
                frames: [{ key: 'player', frame: F.WALK_W1 }, { key: 'player', frame: F.WALK_W2 }],
                frameRate: 8, repeat: -1,
            });

            this.anims.create({ key: 'attack_up',    frames: [{ key: 'player', frame: F.ATK_N }], frameRate: 1 });
            this.anims.create({ key: 'attack_down',   frames: [{ key: 'player', frame: F.ATK_S }], frameRate: 1 });
            this.anims.create({ key: 'attack_right',  frames: [{ key: 'player', frame: F.ATK_E }], frameRate: 1 });
            this.anims.create({ key: 'attack_left',   frames: [{ key: 'player', frame: F.ATK_W }], frameRate: 1 });
        }

        this.player.play('idle_down');
    }

    // handle*: time: number from update loop; typed to kill implicit any.
    // Delegates pure calcs to gameSceneUtils (e.g., vel norm, facing, anim key, iframes alpha).
    // Side-effects (setVel/setAnim/setAlpha, Phaser input read) stay here; behavior identical.
    _handlePlayerMovement(time: number): void {
        if (this.isAttacking) return;

        // Raw input to vel (cursors/wasd/touch; ! asserts as original for TS).
        // cursors/wasd keys: Phaser types mark some optional, but createCursorKeys/addKeys
        // always provides all (! non-null assertion). Guarantees no null/undefined.
        const left  = this.cursors.left!.isDown  || this.wasd.left.isDown;
        const right = this.cursors.right!.isDown || this.wasd.right.isDown;
        const up    = this.cursors.up!.isDown    || this.wasd.up.isDown;
        const down  = this.cursors.down!.isDown  || this.wasd.down.isDown;

        let vx = 0;
        let vy = 0;
        if (left)  vx -= 1;
        if (right) vx += 1;
        if (up)    vy -= 1;
        if (down)  vy += 1;

        // Touch fallback
        if (vx === 0 && vy === 0) {
            vx = this.touchDir.x;
            vy = this.touchDir.y;
        }

        // Pure extracts:
        const normVel = calcNormalizedVelocity(vx, vy, PLAYER_SPEED);
        vx = normVel.vx;
        vy = normVel.vy;

        // Snap facing (pure; preserves current on idle for anim/attack/sword dir reuse; fixes regression).
        // Pass this.facing as current (behavior: last move dir persists).
        this.facing = getFacingFromVelocity(vx, vy, this.facing);

        // Anim key (pure; check play to avoid redundant).
        const animKey = getAnimKey(this.facing, vx !== 0 || vy !== 0);
        if (this.player.anims.currentAnim?.key !== animKey) {
            this.player.play(animKey, true);
        }

        this.player.setVelocity(vx, vy);

        // Iframes (pure alpha calc; set here).
        const alpha = calcIframesAlpha(time, this.lastHitTime, IFRAMES_DUR);
        this.player.setAlpha(alpha);
    }

    // =======================================================================
    // ATTACK
    // =======================================================================

    // time: number from update
    // Delegates pure checks/offsets/dims to utils (isAttackReady, calcAttackOffset, getSwordDimensions).
    // JustPressed (Phaser), object creation/physics/delayedCall/anim stay here; behavior identical.
    _handleAttack(time: number): void {
        const justPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.touchAttack;

        // Pure predicate for ready check (covers justPressed, cd, state).
        if (isAttackReady(justPressed, this.isAttacking, time, this.lastAttackTime, ATTACK_CD)) {
            this.isAttacking    = true;
            this.lastAttackTime = time;
            this.touchAttack    = false;

            this.player.setVelocity(0, 0);
            this.player.play(`attack_${this.facing}`, true);

            // Pure offset + dims (facing-based; no render).
            const { offX, offY } = calcAttackOffset(this.facing, ATTACK_RANGE);
            const { width, height } = getSwordDimensions(this.facing);

            // Temporary sword hitbox
            const sword = this.add.rectangle(
                this.player.x + offX,
                this.player.y + offY,
                width, height,
                0xffffff, 0.3,
            ).setDepth(6);

            this.physics.add.existing(sword);
            this.swordGroup.add(sword);

            this._createSlashEffect(this.player.x + offX, this.player.y + offY);

            // Sword hit detection now handled by persistent swordGroup overlap
            // in create() (prevents callback accumulation; Lynels now take
            // exactly 3 hits, Goblins/Wizrobes 1 hit as intended).
            // Sword may be destroyed early on hit (see overlap cb), so check.

            this.time.delayedCall(ATTACK_DUR, () => {
                // Safe destroy (no-op if already gone from hit)
                if (sword && sword.active) {
                    sword.destroy();
                }
                this.isAttacking = false;
                this.player.play(`idle_${this.facing}`, true);
            });
        }
    }

    // Wrapper for utils.createSlashEffect (extracted particle math for readability/tests).
    // x/y: number pos for slash particles.
    // Delegates to pure util (scene injected; original body moved).
    _createSlashEffect(x: number, y: number): void {
        createSlashEffect(this, x, y);
    }

    // =======================================================================
    // ENEMIES
    // =======================================================================

    // Creates varied enemies; uses EnemyConfig from constants.ts and casts to
    // GameEnemy interface for type-safe property access (hp, type, etc.).
    // Delegates core creation/spawn to utils.createEnemies (extracted; uses getValidEnemySpawn for pure pos calc).
    // Groups init, overlap cb, variety guarantee stay here; behavior identical.
    _createEnemies(): void {
        // Enemies now include variety: Goblin (melee), Wizrobe (ranged projectile
        // shooter), Lynel (slow tank). Follows Goblin pattern using Phaser
        // graphics fallbacks only — no sprites required.
        this.enemies          = this.physics.add.group();
        this.heartDrops       = this.physics.add.group();
        // Projectiles group for Wizrobe attacks (phys colliders/overlaps
        // defined in create())
        this.enemyProjectiles = this.physics.add.group();

        // Calc player start pos for spawn avoid (center).
        const startX = Math.floor(MAP_COLS / 2) * TILE_SIZE;
        const startY = Math.floor(MAP_ROWS / 2) * TILE_SIZE;
        const playerPos: PositionedObject = { x: startX, y: startY };

        // Delegate to utils (full spawn/variety/config; returns array).
        const enemyList = createEnemies(this, NUM_ENEMIES, mapData, playerPos);

        // Add to group (scene side).
        // enemy: GameEnemy from utils (type safe).
        enemyList.forEach((enemy: GameEnemy) => this.enemies.add(enemy));

        // Heart pickup overlap
        // cb uses PhysicsCallbackObject union for Phaser sig compat (no implicit any).
        // Heart is GameObject (union covers; has destroy).
        this.physics.add.overlap(
            this.player,
            this.heartDrops,
            (_p: PhysicsCallbackObject, heart: PhysicsCallbackObject) => {
                // Effective max HP accounts for triforce bonus
                const effectiveMax = this.triforcePieces >= NUM_CHESTS ? TRIFORCE_BONUS_HP : MAX_HP;
                this.playerHP = Math.min(effectiveMax, this.playerHP + HEART_HP);
                heart.destroy();
            },
            undefined,
            this,
        );
    }

    // Iterates enemies via extracted utils.updateEnemies (AI loop from forEach body).
    // (User-identified chunk: chase/patrol/shoot/bob math extracted for readability/tests;
    // scene-specific shoot delegated to _enemyShoot.)
    _updateEnemies(time: number): void {
        // Delegate to pure util; returns enemies that should fire this frame.
        const shooters = updateEnemies(this.enemies, this.player, time);
        for (const enemy of shooters) {
            this._enemyShoot(enemy);
        }
    }

    // enemy: GameEnemy (via intersection; used in damage/kill flows).
    _killEnemy(enemy: GameEnemy): void {
        if (enemy.isDying) return;
        enemy.isDying = true;
        // body! : disable for dying enemy (non-null assertion).
        enemy.body!.enable = false;
        this.enemiesKilled++;

        // Simple debug for Lynel kill (console only)
        if (enemy.type === 'lynel') {
            console.log(`Lynel KILLED! (HP was ${enemy.hp} -- check if after 3 hits)`);
        }

        this._createDeathEffect(enemy.x, enemy.y);

        this.tweens.add({
            targets: enemy,
            alpha: 0, scaleX: 1.5, scaleY: 1.5,
            duration: 300,
            onComplete: () => {
                const heart = this.physics.add.sprite(enemy.x, enemy.y, 'heart_drop')
                    .setDepth(3).setScale(1.2);
                this.heartDrops.add(heart);

                this.tweens.add({
                    targets: heart,
                    y: heart.y - 8,
                    duration: 500,
                    yoyo: true, repeat: -1,
                    ease: 'Sine.easeInOut',
                });

                enemy.destroy();
            },
        });
    }

    // Wrapper for utils.createDeathEffect (extracted particle math).
    // x/y: number pos for death particles.
    // Delegates to pure util (scene injected; original body moved).
    _createDeathEffect(x: number, y: number): void {
        createDeathEffect(this, x, y);
    }

    // -----------------------------------------------------------------------
    // _enemyShoot — Wizrobe-specific: fires slow projectile toward player
    // Uses same angle/dist logic as enemy AI; projectile uses fallback
    // graphic. Now properly travels (offset spawn avoids instant obstacle hit);
    // still destroyed on hit/obstacle or after timeout (~4s).
    // -----------------------------------------------------------------------
    // enemy: GameEnemy (wizrobe); creates typed proj sprite.
    // x/y: number coords; body! for Arcade body.
    _enemyShoot(enemy: GameEnemy): void {
        // Use extracted util for pure projectile math (angle/offset/start).
        // (Improves testability; Wizrobe-specific logic stays here.)
        // Only Wizrobes have .shoots=true; slow as specified.
        const { angle, startX, startY } = calcProjectileParams(enemy, this.player);

        // Simple debug for Wizrobe shot (console only; confirms fire + dir)
        // Enhanced with pos/vel checks to validate movement (why not traveling?).
        console.log(`Wizrobe shooting! angle=${angle.toFixed(2)}, toward player`);

        // Create proj *then* configure body fully before group/velocity/collider
        // (Fixes cases where vel=0 or early destroy: order, explicit body props,
        // post-add velocity force. Keeps offset + timeout.)
        const proj = this.physics.add.sprite(startX, startY, 'enemy_proj');
        proj.setDepth(3);
        proj.setScale(0.75);
        // Visual: point toward player (optional rotation)
        proj.setRotation(angle);

        // Explicit body config for movement (Arcade physics: enable, no gravity,
        // immovable=false ensures velocity applies; prevents 'dropped' static projs).
        // body! : non-null for physics sprite.
        proj.body!.enable = true;
        proj.body!.setAllowGravity(false);
        proj.body!.setImmovable(false);
        // No world bounds collide (just obstacles)

        this.enemyProjectiles.add(proj);

        // Slow projectile speed from config
        // Set velocity *after* group add (ensures body initialized).
        const speed = enemy.projSpeed || 80;
        proj.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
        );

        // Debug: log initial state + movement check at 100ms/500ms
        // (Validates vel applies; e.g., should show pos change ~40px by 500ms.)
        // proj.body!.velocity (though ! not needed post-set, for consistency)
        console.log(`Proj spawned at (${proj.x.toFixed(0)},${proj.y.toFixed(0)}), vel=(${proj.body!.velocity.x.toFixed(0)},${proj.body!.velocity.y.toFixed(0)})`);
        this.time.delayedCall(100, () => {
            if (proj.active) {
                console.log(`Proj at 100ms: pos=(${proj.x.toFixed(0)},${proj.y.toFixed(0)}), vel=${proj.body!.velocity.x.toFixed(0)} (should be moving)`);
            }
        });
        this.time.delayedCall(500, () => {
            if (proj.active) {
                console.log(`Proj at 500ms: pos=(${proj.x.toFixed(0)},${proj.y.toFixed(0)}), vel=${proj.body!.velocity.x.toFixed(0)} (should have traveled ~40px)`);
            }
        });

        // Prevent memory leak / stray projectiles
        this.time.delayedCall(PROJ_LIFETIME, () => {
            if (proj.active) {
                proj.destroy();
            }
        });
    }

    // =======================================================================
    // COMBAT — player & enemy damage (extended for Lynel HP & Wizrobe projs)
    // Shared _damage* helpers keep code DRY; supports multi-hit & projectiles.
    // =======================================================================

    // -----------------------------------------------------------------------
    // _damageEnemy — handles variable HP (Goblin=1 hit, Lynel=3 hits)
    // Flash effect on hit; only kill when HP depleted. Follows Goblin death
    // pattern but generalized.
    // -----------------------------------------------------------------------
    // Param typed as GameEnemy for HP/type safety.
    _damageEnemy(enemy: GameEnemy): void {
        if (enemy.isDying) return;

        // Decrement type-specific HP (default 1 for backward compat)
        // Restored simple .hp (data storage + extras broke game; HP bug was in overlap/scale).
        const oldHp = enemy.hp;
        enemy.hp = (enemy.hp || 1) - 1;

        // Simple debug log for Lynel hits (console only; no custom funcs to avoid crashes).
        // Check console when attacking Lynel.
        if (enemy.type === 'lynel') {
            console.log(`Lynel hit! HP: ${oldHp} -> ${enemy.hp}/3 (dying=${enemy.isDying}, will kill? ${enemy.hp <= 0})`);
        }

        // Brief white flash feedback (works for all enemy types)
        enemy.setTint(0xffffff);
        this.time.delayedCall(150, () => {
            // Safety check in case enemy destroyed meanwhile
            if (enemy.active) {
                enemy.clearTint();
            }
        });

        if (enemy.hp <= 0) {
            // Delegate to existing kill logic (death effect, heart drop, etc.)
            this._killEnemy(enemy);
        }
    }

    // -----------------------------------------------------------------------
    // _damagePlayer — core damage/knockback shared by:
    //   - enemy body collision (_onPlayerHit)
    //   - Wizrobe projectile (_onPlayerHitByProj)
    // Iframes prevent spam; extracted from original for reuse.
    // -----------------------------------------------------------------------
    // source: PositionedObject (structural {x,y}; compatible with all physics objs
    // passed from cbs, avoids Phaser union/body-null quirks, no implicit any).
    _damagePlayer(source: PositionedObject): void {
        // source: enemy sprite or projectile sprite (for angle calc)
        const now = this.time.now;
        if (now - this.lastHitTime < IFRAMES_DUR) return;

        this.lastHitTime = now;
        this.playerHP -= ENEMY_DMG;

        // Use extracted util for pure knockback velocity calc.
        // (Math/angle extracted to gameSceneUtils.ts for testability.)
        const { vx, vy } = calcKnockbackVelocity(source, this.player, 300);
        this.player.setVelocity(vx, vy);

        this.cameras.main.shake(100, 0.01);
        this.player.setTint(0xff0000);
        this.time.delayedCall(150, () => this.player.clearTint());

        if (this.playerHP <= 0) {
            this.playerHP = 0;
            this._showGameOver();
        }
    }

    // -----------------------------------------------------------------------
    // _onPlayerHit — player touches enemy (melee damage from Goblin/Lynel/etc)
    // -----------------------------------------------------------------------
    // Params use PhysicsCallbackObject (exact union from Phaser's ArcadePhysicsCallback)
    // to ensure fn assignable to overlap sig (fixes type mismatch error).
    // Then assert enemy to GameEnemy (intersection allows; inherits custom props
    // safely, no 'any'). Player unused.
    _onPlayerHit(player: PhysicsCallbackObject, enemy: PhysicsCallbackObject): void {
        // Cast for custom prop access (isDying); union doesn't guarantee.
        const enemyTyped = enemy as GameEnemy;
        if (enemyTyped.isDying) return;
        // Delegate to shared damage func
        // Cast enemy (known to be GameEnemy from group).
        this._damagePlayer(enemyTyped);
    }

    // -----------------------------------------------------------------------
    // _onPlayerHitByProj — player hit by Wizrobe's slow projectile
    // Destroys the proj immediately (unlike persistent enemy bodies)
    // -----------------------------------------------------------------------
    // Similar: union param for cb compat; cast proj to GameEnemy? but treat as
    // positioned sprite for damage (proj is Sprite).
    // proj.destroy ok on union.
    _onPlayerHitByProj(player: PhysicsCallbackObject, proj: PhysicsCallbackObject): void {
        // Apply damage then cleanup proj
        // Cast for PositionedObject structural match.
        this._damagePlayer(proj as PositionedObject);
        // Assert destroy (union has it for GameObjects).
        (proj as Phaser.Physics.Arcade.Sprite).destroy();
    }

    // =======================================================================
    // CHESTS / TRIFORCE
    // =======================================================================

    /**
     * Place closed chests at the pre-generated positions.
     * Each chest carries a `content` descriptor (currently triforce pieces)
     * that is evaluated on open — making it trivial to add new loot types.
     */
    _createChests(): void {
        this.chests = [];
        chestPositions.forEach((pos, i) => {
            const chest = this.physics.add.sprite(pos.x, pos.y, 'chest_closed') as GameChest;
            chest.setDepth(3).setImmovable(true);
            chest.opened = false;
            chest.chestIndex = i;
            chest.content = CHEST_CONTENTS[i];
            // Subtle float animation so the chest draws attention
            this.tweens.add({
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
     * Called every frame: if the player is close enough to an unopened chest,
     * open it, award the content, and play a brief feedback animation.
     */
    _checkChests(): void {
        for (const chest of this.chests) {
            if (chest.opened) continue;

            const dist = Phaser.Math.Distance.Between(
                this.player.x, this.player.y, chest.x, chest.y,
            );
            if (dist > CHEST_INTERACT_RANGE) continue;

            // Open the chest
            chest.opened = true;
            chest.setTexture('chest_opened');

            // Process content — extensible via switch on content.type
            this._processChestContent(chest);
        }
    }

    /**
     * Handle the content of an opened chest.
     * Switch on `content.type` so adding new loot categories is a one-case change.
     */
    _processChestContent(chest: GameChest): void {
        const { content } = chest;

        switch (content.type) {
            case 'triforce_piece':
                this._collectTriforcePiece(chest);
                break;
            // future: case 'potion': / case 'key': / etc.
        }
    }

    /**
     * Award a triforce piece: spawn a floating triangle that flies to the
     * player, increment counter, flash label, and check for full triforce.
     */
    _collectTriforcePiece(chest: GameChest): void {
        this.triforcePieces++;

        // Spawn a floating triforce piece that tweens toward the player
        const piece = this.add.image(chest.x, chest.y - 16, 'triforce_piece')
            .setDepth(10).setScale(1.5);

        this.tweens.add({
            targets: piece,
            y: piece.y - 32,
            alpha: 0,
            scaleX: 2.5,
            scaleY: 2.5,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => piece.destroy(),
        });

        // Flash label
        this._showChestFlash(chest.content.label);

        // Camera feedback
        this.cameras.main.flash(300, 255, 215, 0, false); // gold flash

        // Check full triforce
        if (this.triforcePieces >= NUM_CHESTS) {
            this._onTriforceComplete();
        }
    }

    /**
     * Show a brief text label near the HUD when a chest is opened.
     */
    _showChestFlash(label: string): void {
        if (this.chestFlashText) {
            this.chestFlashText.destroy();
        }
        this.chestFlashText = this.add.text(512, 140, label, {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
        }).setScrollFactor(0).setDepth(201).setOrigin(0.5);

        this.tweens.add({
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
     * Called when all 3 triforce pieces are collected.
     * Upgrades MAX_HP to 8 hearts and fully heals the player.
     */
    _onTriforceComplete(): void {
        // Upgrade HP to 8 hearts
        this.playerHP = TRIFORCE_BONUS_HP;

        // Rebuild heart HUD to show 8 hearts
        this._rebuildHeartUI(TRIFORCE_BONUS_HP);

        // Big camera + screen flash
        this.cameras.main.flash(600, 255, 255, 100, false);
        this.cameras.main.shake(200, 0.015);

        // Show "Triforce Complete!" flash
        this._showChestFlash('✦ Triforce Complete! HP upgraded! ✦');

        console.log('Triforce complete! Player HP upgraded to', TRIFORCE_BONUS_HP);
    }

    /**
     * Rebuild the heart HUD sprites for a new max HP value.
     * Used when the triforce bonus changes the heart count.
     */
    _rebuildHeartUI(newMaxHp: number): void {
        // Destroy old hearts
        this.heartSprites.forEach((h) => h.destroy());
        this.heartSprites = [];

        const numHearts = Math.ceil(newMaxHp / HEART_HP);
        for (let i = 0; i < numHearts; i++) {
            const heart = this.add.image(20 + i * 28, 20, 'heart_full')
                .setScrollFactor(0).setDepth(100).setScale(1.5);
            this.heartSprites.push(heart);
        }
    }

    // =======================================================================
    // UI
    // =======================================================================

    // UI methods: no params; typed void for completeness (no implicit any).
    _createUI(): void {
        this.heartSprites = [];
        const numHearts = Math.ceil(MAX_HP / HEART_HP);
        for (let i = 0; i < numHearts; i++) {
            const heart = this.add.image(20 + i * 28, 20, 'heart_full')
                .setScrollFactor(0).setDepth(100).setScale(1.5);
            this.heartSprites.push(heart);
        }

        this.enemyText = this.add.text(20, 48, `Enemies: ${NUM_ENEMIES}/${NUM_ENEMIES}`, {
            fontFamily: 'monospace', fontSize: '16px',
            color: '#ffffff', stroke: '#000000', strokeThickness: 3,
        }).setScrollFactor(0).setDepth(100);

        // Triforce piece indicators (top-right area of HUD)
        this.triforceHudSprites = [];
        for (let i = 0; i < NUM_CHESTS; i++) {
            const tx = this.scale.width - 80 + i * 24;
            const tri = this.add.image(tx, 20, 'triforce_hud_empty')
                .setScrollFactor(0).setDepth(100).setScale(1.3);
            this.triforceHudSprites.push(tri);
        }

        // Overlay UI elements (hearts, enemies count, game over/victory)
        // (Debug text removed per request; console logs remain for dev if needed.)

        this.overlayBg = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.6)
            .setScrollFactor(0).setDepth(200).setVisible(false);

        this.overlayText = this.add.text(512, 350, '', {
            fontFamily: 'monospace', fontSize: '48px',
            color: '#ffffff', stroke: '#000000', strokeThickness: 4, align: 'center',
        }).setScrollFactor(0).setDepth(201).setOrigin(0.5).setVisible(false);

        this.overlaySubText = this.add.text(512, 420, 'Press R to restart', {
            fontFamily: 'monospace', fontSize: '20px',
            color: '#cccccc', stroke: '#000000', strokeThickness: 2, align: 'center',
        }).setScrollFactor(0).setDepth(201).setOrigin(0.5).setVisible(false);
    }

    _updateUI(): void {
        // Current effective max HP (upgraded after triforce)
        const effectiveMaxHp = this.triforcePieces >= NUM_CHESTS ? TRIFORCE_BONUS_HP : MAX_HP;
        const numHearts = this.heartSprites.length;
        for (let i = 0; i < numHearts; i++) {
            // Delegate pure texture key calc (HP state).
            this.heartSprites[i].setTexture(
                getHeartTexture(this.playerHP, i, effectiveMaxHp, HEART_HP),
            );
        }

        // Pure remaining calc.
        const remaining = getRemainingEnemies(this.enemiesKilled, NUM_ENEMIES);
        this.enemyText.setText(`Enemies: ${remaining}/${NUM_ENEMIES}`);

        // Triforce HUD — light up collected pieces
        for (let i = 0; i < this.triforceHudSprites.length; i++) {
            this.triforceHudSprites[i].setTexture(
                i < this.triforcePieces ? 'triforce_hud' : 'triforce_hud_empty',
            );
        }

        if (remaining <= 0 && !this.victory) {
            this._showVictory();
        }
    }

    // =======================================================================
    // WIN / LOSE
    // =======================================================================

    _showVictory(): void {
        this.victory = true;
        this.player.setVelocity(0, 0);

        this.overlayBg.setVisible(true);
        this.overlayText.setText('Victory!').setVisible(true).setColor('#ffdd44');
        this.overlaySubText.setVisible(true);

        const colors = [0xffdd44, 0xff6644, 0x44ddff, 0x44ff44];
        for (let i = 0; i < 30; i++) {
            this.time.delayedCall(i * 100, () => {
                const cx = Phaser.Math.Between(200, 824);
                const cy = Phaser.Math.Between(200, 568);
                const p = this.add.rectangle(cx, cy, 8, 8,
                    Phaser.Utils.Array.GetRandom(colors), 1,
                ).setScrollFactor(0).setDepth(202);
                this.tweens.add({
                    targets: p,
                    y: cy - 100, alpha: 0, scaleX: 0, scaleY: 0,
                    duration: 1000,
                    onComplete: () => p.destroy(),
                });
            });
        }
    }

    _showGameOver(): void {
        this.gameOver = true;
        this.player.setVelocity(0, 0);
        this.player.setTint(0x666666);

        this.overlayBg.setVisible(true);
        this.overlayText.setText('Game Over').setVisible(true).setColor('#ff4444');
        this.overlaySubText.setVisible(true);
    }

    // =======================================================================
    // TOUCH CONTROLS
    // =======================================================================

    // Pointer events: typed Phaser.Input.Pointer (x,y,isDown,downX etc.; no implicit any).
    _setupTouchControls(): void {
        this.touchDir    = { x: 0, y: 0 };
        this.touchAttack = false;

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.x > this.scale.width * 0.7) {
                this.touchAttack = true;
            }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown && pointer.x <= this.scale.width * 0.7) {
                const dx   = pointer.x - pointer.downX;
                const dy   = pointer.y - pointer.downY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 10) {
                    this.touchDir.x = dx / dist;
                    this.touchDir.y = dy / dist;
                } else {
                    this.touchDir.x = 0;
                    this.touchDir.y = 0;
                }
            }
        });

        this.input.on('pointerup', () => {
            this.touchDir.x  = 0;
            this.touchDir.y  = 0;
            this.touchAttack = false;
        });
    }
}
