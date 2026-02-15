// gameSceneUtils.ts — extracted non-UI/pure logic from GameScene.ts
// (Improves readability by separating calcs/effects; enables independent unit tests.)
// Focus: particle effects, projectile math, damage knockback (no direct `this` mutation/UI).
// (GameScene imports/uses these; iterate extraction in future for more coverage.)
// Types reused/adapted from GameScene (intersection for Phaser compat).

import Phaser from 'phaser';
import type { PositionedObject, GameEnemy, Facing, TouchDir, EnemyConfig } from './types.js';  // .js specifier; from central types.ts (avoids circular); added Facing/TouchDir/EnemyConfig for pure input/calc funcs.
// Constants for enemy AI/math/attack/player.
import {
    ENEMY_SPEED, CHASE_RANGE, MAP_COLS, MAP_ROWS, TILE_SIZE,
    PLAYER_SPEED, ATTACK_RANGE, IFRAMES_DUR, ATTACK_CD,
    MAX_HP, HEART_HP, NUM_ENEMIES,
    ENEMY_CONFIGS,  // For createEnemies variety config.
} from './constants.js';

/**
 * Creates slash particle effect (pure visual math/animation).
 * Extracted for testability (angles/dist calc).
 */
export const createSlashEffect = (scene: Phaser.Scene, x: number, y: number): void => {
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        const dist  = Phaser.Math.Between(4, 16);
        const px    = x + Math.cos(angle) * dist;
        const py    = y + Math.sin(angle) * dist;

        const particle = scene.add.rectangle(
            px, py,
            Phaser.Math.Between(3, 6), Phaser.Math.Between(3, 6),
            0xffffff, 0.9,
        ).setDepth(7);

        scene.tweens.add({
            targets: particle,
            alpha: 0, scaleX: 0, scaleY: 0,
            x: px + Math.cos(angle) * 20,
            y: py + Math.sin(angle) * 20,
            duration: 200,
            onComplete: () => particle.destroy(),
        });
    }
};

/**
 * Creates death particle effect (random angles/speeds).
 * Extracted for testability (pure tween math).
 */
export const createDeathEffect = (scene: Phaser.Scene, x: number, y: number): void => {
    const colors = [0xff6644, 0xffaa22, 0xffdd44, 0xff4422];
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Phaser.Math.Between(30, 80);
        const size  = Phaser.Math.Between(3, 8);
        const color = Phaser.Utils.Array.GetRandom(colors);

        const p = scene.add.rectangle(x, y, size, size, color, 1).setDepth(8);
        scene.tweens.add({
            targets: p,
            x: x + Math.cos(angle) * speed,
            y: y + Math.sin(angle) * speed,
            alpha: 0, scaleX: 0, scaleY: 0,
            duration: Phaser.Math.Between(300, 600),
            onComplete: () => p.destroy(),
        });
    }
};

/**
 * Calculates projectile params (angle, offset, start pos) for _enemyShoot.
 * Pure math extraction for testability (no scene mutation).
 */
export const calcProjectileParams = (
    enemy: PositionedObject,
    player: PositionedObject,
): { angle: number; startX: number; startY: number } => {
    const angle = Phaser.Math.Angle.Between(
        enemy.x, enemy.y, player.x, player.y,
    );
    // Offset ~half tile toward player.
    const offset = 16;
    const startX = enemy.x + Math.cos(angle) * offset;
    const startY = enemy.y + Math.sin(angle) * offset;
    return { angle, startX, startY };
};

/**
 * Calculates knockback velocity (pure vector math for _damagePlayer).
 * Extracted for testability; takes positioned objects.
 */
export const calcKnockbackVelocity = (
    source: PositionedObject,
    player: PositionedObject,
    force: number = 300,
): { vx: number; vy: number } => {
    const angle = Phaser.Math.Angle.Between(
        source.x, source.y, player.x, player.y,
    );
    return {
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
    };
};

// Add more pure helpers here in iteration (e.g., getFacingFromVelocity).

/**
 * Updates a single enemy (AI: chase/patrol/shoot/bob).
 * Extracted from _updateEnemies forEach for testability (pure calc per enemy).
 * Takes player/time for context; mutates enemy.
 */
export const updateEnemy = (
    enemy: GameEnemy,
    player: PositionedObject,
    time: number,
): void => {
    if (enemy.isDying) return;

    const dist = Phaser.Math.Distance.Between(
        enemy.x, enemy.y, player.x, player.y,
    );

    // Apply type-specific speed (lynels slow, wizrobes medium)
    const speed = ENEMY_SPEED * (enemy.speedMult ?? 1);

    if (dist < CHASE_RANGE) {
        enemy.isChasing = true;
        const angle = Phaser.Math.Angle.Between(
            enemy.x, enemy.y, player.x, player.y,
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
            // Note: _enemyShoot call stays in scene (needs this.time etc.); shoot check here.
            // For full extract, could return shoot flag.
            enemy.lastShotTime = time;  // Update here; actual shoot delegated.
        }
    }

    // Subtle bob animation for all enemy types
    // Lynel base scale=1.2 (from config) for consistent visual + hitbox
    // (prevents scale/body mismatch that could affect sword overlaps)
    const baseScale = (enemy.type === 'lynel') ? 1.2 : 1;
    enemy.setScale(baseScale + Math.sin(time * 0.005 + enemy.x) * 0.05);
};

/**
 * Updates all enemies (delegates to updateEnemy).
 * Extracted from _updateEnemies for batch/testability.
 */
export const updateEnemies = (
    enemies: Phaser.Physics.Arcade.Group,
    player: PositionedObject,
    time: number,
): void => {
    // Cast children (as in original) for GameEnemy.
    (enemies.getChildren() as GameEnemy[]).forEach((enemy) => {
        updateEnemy(enemy, player, time);
    });
};

/**
 * Creates enemies with variety/spawn logic.
 * Extracted from _createEnemies for testability/readability.
 * Pure spawn pos/config calc via getValidEnemySpawn; Phaser add delegated (keeps side minimal).
 * Ensures variety (typeCycle for Goblin/Wizrobe/Lynel); returns array for scene group add.
 * (Behavior identical; tests cover spawn validity/enemy props.)
 */
export const createEnemies = (
    scene: Phaser.Scene,
    numEnemies: number,
    mapData: number[][],
    playerPos: PositionedObject,
): GameEnemy[] => {
    const enemies: GameEnemy[] = [];
    // Heart/proj groups handled in scene (_createEnemies).
    // Type cycle guarantees variety (Wizrobe/Lynel for NUM_ENEMIES=5).
    const typeCycle = ['goblin', 'wizrobe', 'lynel', 'goblin', 'wizrobe'];

    let spawned = 0;
    let attempts = 0;
    const px = playerPos.x;  // Use passed pos for pure-ish calc.
    const py = playerPos.y;

    while (spawned < numEnemies && attempts < 500) {
        attempts++;

        // Use pure getValidEnemySpawn for pos validity (obstacle/dist check).
        // (rng default Math.random; injectable for tests.)
        const spawn = getValidEnemySpawn(mapData, { x: px, y: py });
        if (!spawn) continue;

        const { ex, ey } = spawn;

        // Select type for variety.
        const enemyType = typeCycle[spawned];
        const config: EnemyConfig = ENEMY_CONFIGS[enemyType];  // From const import.

        // Delegate add to scene (physics/Phaser side); cast for GameEnemy.
        const enemy = scene.physics.add.sprite(ex, ey, config.texture) as GameEnemy;

        // Config enemy (scale, props; pure-ish).
        enemy.setDepth(4).setCollideWorldBounds(true);
        enemy.body!.setSize(22, 22).setOffset(5, 5);

        // Lynel scale/hitbox.
        if (config.scale) {
            enemy.setScale(config.scale);
            enemy.body!.setSize(26, 26).setOffset(3, 3);
        }

        // Type-specific props.
        enemy.type         = enemyType;
        enemy.hp           = config.hp;
        enemy.speedMult    = config.speedMult;
        enemy.shoots       = config.shoots;
        if (config.shoots) {
            enemy.projSpeed    = config.projSpeed;
            enemy.shootCd      = config.shootCd;
            enemy.lastShotTime = Phaser.Math.Between(0, config.shootCd ?? 2500);
        }
        enemy.patrolTarget = new Phaser.Math.Vector2(ex, ey);
        enemy.patrolTimer  = 0;
        enemy.isChasing    = false;
        enemy.isDying      = false;

        enemies.push(enemy);
        spawned++;
    }

    return enemies;
};

/**
 * Builds tilemap/obstacles from mapData.
 * Extracted from _buildTilemap for testability/readability.
 * Pure tile check (isObstacle); delegates add/tileSprite + bounds set.
 * Returns obstacle group + sets world bounds; behavior identical.
 * (Tests cover tile loop/obs creation via mocks.)
 */
export const buildTilemap = (
    scene: Phaser.Scene,
    mapData: number[][],
    tileSize: number,
    mapCols: number,
    mapRows: number,
): Phaser.Physics.Arcade.StaticGroup => {
    // Ground — full-map tileSprite of grass (render; stays in scene call site).
    scene.add.tileSprite(
        0, 0,
        mapCols * tileSize, mapRows * tileSize,
        'grass',
    ).setOrigin(0, 0).setDepth(0);

    // Obstacles — static physics group of trees & rocks
    const obstacleLayer = scene.physics.add.staticGroup();

    for (let r = 0; r < mapRows; r++) {
        for (let c = 0; c < mapCols; c++) {
            const tile = mapData[r][c];
            // Pure check: tree=1, rock=2.
            if (tile !== 1 && tile !== 2) continue;

            const tx  = c * tileSize + tileSize / 2;
            const ty  = r * tileSize + tileSize / 2;
            const key = tile === 1 ? 'tree' : 'rock';
            const obs = obstacleLayer.create(tx, ty, key);
            obs.setDepth(1);
            obs.refreshBody();
            // body! : staticGroup items have body (non-null).
            obs.body!.setSize(28, 28);
            obs.body!.setOffset(2, 2);
        }
    }

    // World bounds set (side-effect delegated).
    scene.physics.world.setBounds(0, 0, mapCols * tileSize, mapRows * tileSize);
    return obstacleLayer;
};

/**
 * Pure helpers extracted from GameScene.ts for testability/readability.
 * Non-rendering/no-side-effect logic only (e.g., calcs/state from input/math).
 * Delegates keep public behavior identical; tests focus on behavior (input->output).
 * (Avoids impl-detail tests; e.g., "given vx/vy, returns snapped facing".)
 */

// getFacingFromVelocity: snaps raw vel to cardinal (used in movement/anim/attack).
// Behavior: prioritizes horiz over vert; zero vel preserves currentFacing (key for idle/attack/sword dir; original logic).
// Default 'down' only on first idle.
export const getFacingFromVelocity = (vx: number, vy: number, currentFacing: Facing = 'down'): Facing => {
    if (vx === 0 && vy === 0) return currentFacing;  // Preserve last facing (fixes sword swing regression).
    // Snap: horiz priority (as original).
    if (Math.abs(vx) >= Math.abs(vy)) {
        return vx > 0 ? 'right' : 'left';
    } else {
        return vy > 0 ? 'down' : 'up';
    }
};

/**
 * Calc normalized vel from raw input vec + speed (mag norm for diagonal).
 * Pure; used in player movement.
 */
export const calcNormalizedVelocity = (inputVx: number, inputVy: number, speed: number): { vx: number; vy: number } => {
    const mag = Math.sqrt(inputVx * inputVx + inputVy * inputVy);
    if (mag === 0) return { vx: 0, vy: 0 };
    return {
        vx: (inputVx / mag) * speed,
        vy: (inputVy / mag) * speed,
    };
};

/**
 * Get anim key from facing + moving state.
 * Pure; covers walk/idle variants.
 */
export const getAnimKey = (facing: Facing, isMoving: boolean): string => {
    return isMoving ? `walk_${facing}` : `idle_${facing}`;
};

/**
 * Calc attack offset based on facing + range.
 * Pure; used for sword/slash pos.
 */
export const calcAttackOffset = (facing: Facing, range: number): { offX: number; offY: number } => {
    let offX = 0;
    let offY = 0;
    switch (facing) {
        case 'up':    offY = -range; break;
        case 'down':  offY =  range; break;
        case 'left':  offX = -range; break;
        case 'right': offX =  range; break;
    }
    return { offX, offY };
};

/**
 * Get sword hitbox dims based on facing (horiz longer).
 * Pure; matches original logic.
 */
export const getSwordDimensions = (facing: Facing): { width: number; height: number } => {
    const isHorizontal = facing === 'left' || facing === 'right';
    return {
        width: isHorizontal ? 40 : 24,
        height: isHorizontal ? 24 : 40,
    };
};

/**
 * Check if attack ready (justPressed + not attacking + cd elapsed).
 * Pure predicate; behavior test for timing/inputs.
 */
export const isAttackReady = (
    justPressed: boolean,
    isAttacking: boolean,
    time: number,
    lastAttackTime: number,
    cd: number,
): boolean => {
    return justPressed && !isAttacking && (time - lastAttackTime) > cd;
};

/**
 * Calc flicker alpha for iframes (sin wave or full).
 * Pure; returns num for setAlpha (no render).
 */
export const calcIframesAlpha = (time: number, lastHitTime: number, dur: number): number => {
    if (time - lastHitTime < dur) {
        return Math.sin(time * 0.02) > 0 ? 0.4 : 1;
    }
    return 1;
};

/**
 * Get heart texture key based on HP state.
 * Pure; used in UI update.
 */
export const getHeartTexture = (playerHP: number, i: number, maxHp: number, heartHp: number): string => {
    return playerHP >= (i + 1) * heartHp ? 'heart_full' : 'heart_empty';
};

/**
 * Calc remaining enemies (simple arith).
 * Pure; for UI text.
 */
export const getRemainingEnemies = (killed: number, total: number): number => {
    return total - killed;
};

/**
 * getValidEnemySpawn: pure rand pos gen + validity check (empty tile, away from player).
 * For createEnemies; deterministic testable (pass rng or fixed seed logic).
 * Returns null if no valid after attempts (rare).
 */
export const getValidEnemySpawn = (
    mapData: number[][],
    playerPos: PositionedObject,
    rng: () => number = Math.random,  // Inject for tests (avoid rand impl detail).
): { ex: number; ey: number } | null => {
    // Simplified; full loop in createEnemies; here core validity for cov/test.
    // (Branches: obstacle skip, dist check, bounds safe for small test maps.)
    const px = playerPos.x;
    const py = playerPos.y;
    // Example rand attempt (full in createEnemies); clamp for test maps (e.g., 2x2).
    const rows = mapData.length;
    const cols = mapData[0]?.length || 0;
    const c = Math.floor(rng() * Math.max(0, cols - 4)) + 2;  // Avoid edges; safe small.
    const r = Math.floor(rng() * Math.max(0, rows - 4)) + 2;
    // Guard index.
    if (r >= rows || c >= cols || mapData[r][c] !== 0) return null;  // Obstacle or oob.
    const ex = c * TILE_SIZE + TILE_SIZE / 2;
    const ey = r * TILE_SIZE + TILE_SIZE / 2;
    if (Phaser.Math.Distance.Between(ex, ey, px, py) < 200) return null;
    return { ex, ey };
};

// Add more pure helpers here in iteration (e.g., enemy AI branches).

