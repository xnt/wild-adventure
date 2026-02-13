import Phaser from 'phaser';
import {
    TILE_SIZE, MAP_COLS, MAP_ROWS,
    PLAYER_SPEED, ENEMY_SPEED, CHASE_RANGE,
    ATTACK_RANGE, ATTACK_DUR, ATTACK_CD,
    MAX_HP, HEART_HP, ENEMY_DMG, NUM_ENEMIES,
    IFRAMES_DUR, FRAMES as F,
    // Enemy variety
    ENEMY_CONFIGS, PROJ_LIFETIME,
} from '../constants.js';
import { mapData } from '../map.js';
import { generateFallbacks } from '../fallbacks.js';

// ===========================================================================
// GameScene — the single scene that runs the entire game
// ===========================================================================

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    // -----------------------------------------------------------------------
    // init — called on every restart; reset all mutable state
    // -----------------------------------------------------------------------
    init() {
        this.playerHP       = MAX_HP;
        this.facing         = 'down';
        this.isAttacking    = false;
        this.lastAttackTime = 0;
        this.lastHitTime    = 0;
        this.enemiesKilled  = 0;
        this.gameOver       = false;
        this.victory        = false;
    }

    // -----------------------------------------------------------------------
    // preload — attempt to load real PNGs; fallbacks generated in create()
    // -----------------------------------------------------------------------
    preload() {
        this.load.on('loaderror', (fileObj) => {
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
    }

    // -----------------------------------------------------------------------
    // create — build world, player, enemies, UI
    // -----------------------------------------------------------------------
    create() {
        generateFallbacks(this);

        this._buildTilemap();
        this._createPlayer();
        this._createEnemies();

        this.swordGroup = this.physics.add.group();

        // Collisions
        // Player & obstacles
        this.physics.add.collider(this.player, this.obstacleLayer);
        // Enemies & obstacles (can't pass trees/rocks)
        this.physics.add.collider(this.enemies, this.obstacleLayer);
        // Enemy projectiles collide with obstacles & destroy on hit
        this.physics.add.collider(
            this.enemyProjectiles, this.obstacleLayer,
            (proj) => proj.destroy(),
            null, this,
        );

        // Sword attacks vs enemies (persistent group overlap -- fixes accumulation
        // bug from per-attack registration; ensures single _damageEnemy call per hit,
        // so Lynels now properly take 3 hits, etc.)
        // Fix for multi-hit per swing (per debug: overlap fired 3x instantly on 1 attack,
        // decrementing HP 3->0). Destroy sword immediately on hit to enforce 1 damage/swing.
        // Simple console debug retained; processCallback kept for extra safety.
        this.physics.add.overlap(
            this.swordGroup, this.enemies,
            (_s, enemy) => {
                // Simple debug: log Lynel sword overlap to console (should fire once/swing now).
                if (enemy.type === 'lynel') {
                    console.log(`Sword overlap hit Lynel! Pre-damage HP=${enemy.hp}, dying=${!!enemy.isDying}, active=${enemy.active}`);
                }
                this._damageEnemy(enemy);
                // Destroy sword on hit (prevents repeat overlap in same attack frame/DUR;
                // Lynel requires 3 *separate* swings).
                _s.destroy();
            },
            // processCallback: only process if not dying (1 hit/sword safety).
            (_s, enemy) => !enemy.isDying,
            this,
        );
        // Player-enemy touch damage
        this.physics.add.overlap(
            this.player, this.enemies, this._onPlayerHit, null, this,
        );
        // Wizrobe projectile damage (slow orbs)
        this.physics.add.overlap(
            this.player, this.enemyProjectiles, this._onPlayerHitByProj,
            null, this,
        );

        // Camera
        this.cameras.main.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
        this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

        // Input
        this.cursors    = this.input.keyboard.createCursorKeys();
        this.wasd       = this.input.keyboard.addKeys({
            up:    Phaser.Input.Keyboard.KeyCodes.W,
            down:  Phaser.Input.Keyboard.KeyCodes.S,
            left:  Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
        this.spaceKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

        this._createUI();
        this._setupTouchControls();

        console.log('Wild Adventure loaded! WASD/Arrows to move, Space to attack.');
    }

    // -----------------------------------------------------------------------
    // update — game loop
    // -----------------------------------------------------------------------
    update(time, _delta) {
        if (this.gameOver || this.victory) {
            if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
                this.scene.restart();
            }
            return;
        }

        this._handlePlayerMovement(time);
        this._handleAttack(time);
        this._updateEnemies(time);
        this._updateUI();
    }

    // =======================================================================
    // WORLD
    // =======================================================================

    _buildTilemap() {
        // Ground — full-map tileSprite of grass
        this.add.tileSprite(
            0, 0,
            MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE,
            'grass',
        ).setOrigin(0, 0).setDepth(0);

        // Obstacles — static physics group of trees & rocks
        this.obstacleLayer = this.physics.add.staticGroup();

        for (let r = 0; r < MAP_ROWS; r++) {
            for (let c = 0; c < MAP_COLS; c++) {
                const tile = mapData[r][c];
                if (tile !== 1 && tile !== 2) continue;

                const tx  = c * TILE_SIZE + TILE_SIZE / 2;
                const ty  = r * TILE_SIZE + TILE_SIZE / 2;
                const key = tile === 1 ? 'tree' : 'rock';
                const obs = this.obstacleLayer.create(tx, ty, key);
                obs.setDepth(1);
                obs.refreshBody();
                obs.body.setSize(28, 28);
                obs.body.setOffset(2, 2);
            }
        }

        this.physics.world.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
    }

    // =======================================================================
    // PLAYER
    // =======================================================================

    _createPlayer() {
        const startX = Math.floor(MAP_COLS / 2) * TILE_SIZE + TILE_SIZE / 2;
        const startY = Math.floor(MAP_ROWS / 2) * TILE_SIZE + TILE_SIZE / 2;

        this.player = this.physics.add.sprite(startX, startY, 'player', F.IDLE_S);
        this.player.setDepth(5);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(20, 22);
        this.player.body.setOffset(6, 8);

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

    _handlePlayerMovement(time) {
        if (this.isAttacking) return;

        let vx = 0;
        let vy = 0;

        const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
        const right = this.cursors.right.isDown || this.wasd.right.isDown;
        const up    = this.cursors.up.isDown    || this.wasd.up.isDown;
        const down  = this.cursors.down.isDown  || this.wasd.down.isDown;

        if (left)  vx -= 1;
        if (right) vx += 1;
        if (up)    vy -= 1;
        if (down)  vy += 1;

        // Touch fallback
        if (vx === 0 && vy === 0) {
            vx = this.touchDir.x;
            vy = this.touchDir.y;
        }

        const mag = Math.sqrt(vx * vx + vy * vy);
        if (mag > 0) {
            vx = (vx / mag) * PLAYER_SPEED;
            vy = (vy / mag) * PLAYER_SPEED;

            // Snap facing to 4 cardinal directions
            if (Math.abs(vx) >= Math.abs(vy)) {
                this.facing = vx > 0 ? 'right' : 'left';
            } else {
                this.facing = vy > 0 ? 'down' : 'up';
            }

            const animKey = `walk_${this.facing}`;
            if (this.player.anims.currentAnim?.key !== animKey) {
                this.player.play(animKey, true);
            }
        } else {
            const animKey = `idle_${this.facing}`;
            if (this.player.anims.currentAnim?.key !== animKey) {
                this.player.play(animKey, true);
            }
        }

        this.player.setVelocity(vx, vy);

        // Iframes flicker
        if (time - this.lastHitTime < IFRAMES_DUR) {
            this.player.setAlpha(Math.sin(time * 0.02) > 0 ? 0.4 : 1);
        } else {
            this.player.setAlpha(1);
        }
    }

    // =======================================================================
    // ATTACK
    // =======================================================================

    _handleAttack(time) {
        const justPressed = Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.touchAttack;

        if (justPressed && !this.isAttacking && (time - this.lastAttackTime) > ATTACK_CD) {
            this.isAttacking    = true;
            this.lastAttackTime = time;
            this.touchAttack    = false;

            this.player.setVelocity(0, 0);
            this.player.play(`attack_${this.facing}`, true);

            let offX = 0, offY = 0;
            switch (this.facing) {
                case 'up':    offY = -ATTACK_RANGE; break;
                case 'down':  offY =  ATTACK_RANGE; break;
                case 'left':  offX = -ATTACK_RANGE; break;
                case 'right': offX =  ATTACK_RANGE; break;
            }

            // Temporary sword hitbox
            const sword = this.add.rectangle(
                this.player.x + offX,
                this.player.y + offY,
                (this.facing === 'left' || this.facing === 'right') ? 40 : 24,
                (this.facing === 'up'   || this.facing === 'down')  ? 40 : 24,
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

    _createSlashEffect(x, y) {
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const dist  = Phaser.Math.Between(4, 16);
            const px    = x + Math.cos(angle) * dist;
            const py    = y + Math.sin(angle) * dist;

            const particle = this.add.rectangle(
                px, py,
                Phaser.Math.Between(3, 6), Phaser.Math.Between(3, 6),
                0xffffff, 0.9,
            ).setDepth(7);

            this.tweens.add({
                targets: particle,
                alpha: 0, scaleX: 0, scaleY: 0,
                x: px + Math.cos(angle) * 20,
                y: py + Math.sin(angle) * 20,
                duration: 200,
                onComplete: () => particle.destroy(),
            });
        }
    }

    // =======================================================================
    // ENEMIES
    // =======================================================================

    _createEnemies() {
        // Enemies now include variety: Goblin (melee), Wizrobe (ranged projectile
        // shooter), Lynel (slow tank). Follows Goblin pattern using Phaser
        // graphics fallbacks only — no sprites required.
        this.enemies          = this.physics.add.group();
        this.heartDrops       = this.physics.add.group();
        // Projectiles group for Wizrobe attacks (phys colliders/overlaps
        // defined in create())
        this.enemyProjectiles = this.physics.add.group();

        let spawned  = 0;
        let attempts = 0;
        const px = Math.floor(MAP_COLS / 2) * TILE_SIZE;
        const py = Math.floor(MAP_ROWS / 2) * TILE_SIZE;

        // Cycle through types to guarantee Wizrobe & Lynel presence (for
        // NUM_ENEMIES=5); rest fill with Goblins/Wizrobes. Positions still
        // randomized.
        const typeCycle = ['goblin', 'wizrobe', 'lynel', 'goblin', 'wizrobe'];

        while (spawned < NUM_ENEMIES && attempts < 500) {
            attempts++;
            const c = Phaser.Math.Between(3, MAP_COLS - 4);
            const r = Phaser.Math.Between(3, MAP_ROWS - 4);
            if (mapData[r][c] !== 0) continue;

            const ex = c * TILE_SIZE + TILE_SIZE / 2;
            const ey = r * TILE_SIZE + TILE_SIZE / 2;
            if (Phaser.Math.Distance.Between(ex, ey, px, py) < 200) continue;

            // Select type for variety
            const enemyType = typeCycle[spawned];
            const config = ENEMY_CONFIGS[enemyType];

            const enemy = this.physics.add.sprite(ex, ey, config.texture);
            enemy.setDepth(4).setCollideWorldBounds(true);
            enemy.body.setSize(22, 22).setOffset(5, 5);

            // Lynel is bigger/slower/tankier
            if (config.scale) {
                enemy.setScale(config.scale);
                // Adjust hitbox for larger size
                enemy.body.setSize(26, 26).setOffset(3, 3);
            }

            // Type-specific props (hp, speed, behavior)
            // (Restored simple .hp prop + basic debug; data storage was part of
            // complex debug that broke spawn/assets.)
            enemy.type         = enemyType;
            enemy.hp           = config.hp;
            enemy.speedMult    = config.speedMult;
            enemy.shoots       = config.shoots;
            if (config.shoots) {
                // Wizrobe-specific
                enemy.projSpeed    = config.projSpeed;
                enemy.shootCd      = config.shootCd;
                // Stagger initial shots
                enemy.lastShotTime = Phaser.Math.Between(0, config.shootCd);
            }
            enemy.patrolTarget = new Phaser.Math.Vector2(ex, ey);
            enemy.patrolTimer  = 0;
            enemy.isChasing    = false;

            this.enemies.add(enemy);
            spawned++;
        }

        // Heart pickup overlap
        this.physics.add.overlap(this.player, this.heartDrops, (_p, heart) => {
            this.playerHP = Math.min(MAX_HP, this.playerHP + HEART_HP);
            heart.destroy();
        }, null, this);
    }

    _updateEnemies(time) {
        // Now handles multiple enemy types:
        // - Goblin: default chase/patrol
        // - Wizrobe: chase + shoots slow projectiles periodically when in range
        // - Lynel: slower movement, higher HP (damage handled elsewhere)
        // All use Phaser's built-in for visuals/phys, matching Goblin pattern.
        this.enemies.getChildren().forEach((enemy) => {
            if (enemy.isDying) return;

            const dist = Phaser.Math.Distance.Between(
                enemy.x, enemy.y, this.player.x, this.player.y,
            );

            // Apply type-specific speed (lynels slow, wizrobes medium)
            const speed = ENEMY_SPEED * (enemy.speedMult ?? 1);

            if (dist < CHASE_RANGE) {
                enemy.isChasing = true;
                const angle = Phaser.Math.Angle.Between(
                    enemy.x, enemy.y, this.player.x, this.player.y,
                );
                enemy.setVelocity(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                );
                enemy.setTint(0xff8888);
            } else {
                enemy.isChasing = false;
                enemy.clearTint();

                enemy.patrolTimer -= 16;
                if (enemy.patrolTimer <= 0) {
                    enemy.patrolTimer = Phaser.Math.Between(2000, 4000);
                    enemy.patrolTarget.set(
                        Phaser.Math.Clamp(enemy.x + Phaser.Math.Between(-80, 80), TILE_SIZE * 2, (MAP_COLS - 2) * TILE_SIZE),
                        Phaser.Math.Clamp(enemy.y + Phaser.Math.Between(-80, 80), TILE_SIZE * 2, (MAP_ROWS - 2) * TILE_SIZE),
                    );
                }

                const pdist = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y, enemy.patrolTarget.x, enemy.patrolTarget.y,
                );
                if (pdist > 4) {
                    const angle = Phaser.Math.Angle.Between(
                        enemy.x, enemy.y, enemy.patrolTarget.x, enemy.patrolTarget.y,
                    );
                    // Slower patrol for tanky/slow types
                    enemy.setVelocity(
                        Math.cos(angle) * speed * 0.5,
                        Math.sin(angle) * speed * 0.5,
                    );
                } else {
                    enemy.setVelocity(0, 0);
                }
            }

            // Wizrobe-specific: shoot slow projectile at player if nearby
            // (uses _enemyShoot; rate from config ~2.5s, slow proj)
            if (enemy.shoots && dist < CHASE_RANGE * 1.5) {
                // Init timer if missing (defensive)
                if (!enemy.lastShotTime) enemy.lastShotTime = 0;
                const cd = enemy.shootCd || 2500;
                if (time - enemy.lastShotTime > cd) {
                    this._enemyShoot(enemy);
                    enemy.lastShotTime = time;
                }
            }

            // Subtle bob animation for all enemy types
            // Lynel base scale=1.2 (from config) for consistent visual + hitbox
            // (prevents scale/body mismatch that could affect sword overlaps)
            const baseScale = (enemy.type === 'lynel') ? 1.2 : 1;
            enemy.setScale(baseScale + Math.sin(time * 0.005 + enemy.x) * 0.05);
        });
    }

    _killEnemy(enemy) {
        if (enemy.isDying) return;
        enemy.isDying = true;
        enemy.body.enable = false;
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

    _createDeathEffect(x, y) {
        const colors = [0xff6644, 0xffaa22, 0xffdd44, 0xff4422];
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Phaser.Math.Between(30, 80);
            const size  = Phaser.Math.Between(3, 8);
            const color = Phaser.Utils.Array.GetRandom(colors);

            const p = this.add.rectangle(x, y, size, size, color, 1).setDepth(8);
            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0, scaleX: 0, scaleY: 0,
                duration: Phaser.Math.Between(300, 600),
                onComplete: () => p.destroy(),
            });
        }
    }

    // -----------------------------------------------------------------------
    // _enemyShoot — Wizrobe-specific: fires slow projectile toward player
    // Uses same angle/dist logic as enemy AI; projectile uses fallback
    // graphic. Now properly travels (offset spawn avoids instant obstacle hit);
    // still destroyed on hit/obstacle or after timeout (~4s).
    // -----------------------------------------------------------------------
    _enemyShoot(enemy) {
        // Only Wizrobes have .shoots=true; slow as specified
        const angle = Phaser.Math.Angle.Between(
            enemy.x, enemy.y, this.player.x, this.player.y,
        );

        // Offset spawn slightly toward player to avoid self/nearby obstacle collision
        // (common cause of 'dropped' projs; ensures travel before destroy).
        const offset = 16;  // ~half tile
        const startX = enemy.x + Math.cos(angle) * offset;
        const startY = enemy.y + Math.sin(angle) * offset;

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
        proj.body.enable = true;
        proj.body.setAllowGravity(false);
        proj.body.setImmovable(false);
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
        console.log(`Proj spawned at (${proj.x.toFixed(0)},${proj.y.toFixed(0)}), vel=(${proj.body.velocity.x.toFixed(0)},${proj.body.velocity.y.toFixed(0)})`);
        this.time.delayedCall(100, () => {
            if (proj.active) {
                console.log(`Proj at 100ms: pos=(${proj.x.toFixed(0)},${proj.y.toFixed(0)}), vel=${proj.body.velocity.x.toFixed(0)} (should be moving)`);
            }
        });
        this.time.delayedCall(500, () => {
            if (proj.active) {
                console.log(`Proj at 500ms: pos=(${proj.x.toFixed(0)},${proj.y.toFixed(0)}), vel=${proj.body.velocity.x.toFixed(0)} (should have traveled ~40px)`);
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
    _damageEnemy(enemy) {
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
    _damagePlayer(source) {
        // source: enemy sprite or projectile sprite (for angle calc)
        const now = this.time.now;
        if (now - this.lastHitTime < IFRAMES_DUR) return;

        this.lastHitTime = now;
        this.playerHP -= ENEMY_DMG;

        // Knockback direction away from source
        const angle = Phaser.Math.Angle.Between(
            source.x, source.y, this.player.x, this.player.y,
        );
        this.player.setVelocity(
            Math.cos(angle) * 300, Math.sin(angle) * 300
        );

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
    _onPlayerHit(player, enemy) {
        if (enemy.isDying) return;
        // Delegate to shared damage func
        this._damagePlayer(enemy);
    }

    // -----------------------------------------------------------------------
    // _onPlayerHitByProj — player hit by Wizrobe's slow projectile
    // Destroys the proj immediately (unlike persistent enemy bodies)
    // -----------------------------------------------------------------------
    _onPlayerHitByProj(player, proj) {
        // Apply damage then cleanup proj
        this._damagePlayer(proj);
        proj.destroy();
    }

    // =======================================================================
    // UI
    // =======================================================================

    _createUI() {
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

    _updateUI() {
        const numHearts = Math.ceil(MAX_HP / HEART_HP);
        for (let i = 0; i < numHearts; i++) {
            this.heartSprites[i].setTexture(
                this.playerHP >= (i + 1) * HEART_HP ? 'heart_full' : 'heart_empty',
            );
        }

        const remaining = NUM_ENEMIES - this.enemiesKilled;
        this.enemyText.setText(`Enemies: ${remaining}/${NUM_ENEMIES}`);

        // (Debug logging for Lynel/Wizrobe removed from screen per request;
        // console logs remain minimal for dev troubleshooting if needed.)

        if (remaining <= 0 && !this.victory) {
            this._showVictory();
        }
    }

    // =======================================================================
    // WIN / LOSE
    // =======================================================================

    _showVictory() {
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

    _showGameOver() {
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

    _setupTouchControls() {
        this.touchDir    = { x: 0, y: 0 };
        this.touchAttack = false;

        this.input.on('pointerdown', (pointer) => {
            if (pointer.x > this.scale.width * 0.7) {
                this.touchAttack = true;
            }
        });

        this.input.on('pointermove', (pointer) => {
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
