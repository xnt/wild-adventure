// ---------------------------------------------------------------------------
// Game constants — tweak these to tune gameplay
// ---------------------------------------------------------------------------

export const TILE_SIZE    = 32;
export const MAP_COLS     = 50;
export const MAP_ROWS     = 50;

export const PLAYER_SPEED = 160;
export const ENEMY_SPEED  = 50;
export const CHASE_RANGE  = 128;

export const ATTACK_RANGE = 48;
export const ATTACK_DUR   = 200;   // attack animation duration (ms)
export const ATTACK_CD    = 1000;  // cooldown between attacks (ms)

export const MAX_HP       = 96;    // 4 hearts × 24 HP each
export const HEART_HP     = 24;    // HP per heart container
export const ENEMY_DMG    = 24;    // damage per enemy touch
export const NUM_ENEMIES  = 5;

export const IFRAMES_DUR  = 800;   // invincibility after hit (ms)

// Frame index mapping for 512×512 player spritesheet (16 cols of 32px).
// Phaser frame = row * 16 + col.
export const FRAMES = {
    IDLE_N: 0,   IDLE_S: 1,   IDLE_E: 2,   ATK_E: 3,
    WALK_S1: 16, WALK_S2: 17, WALK_E1: 18, WALK_E2: 19,
    IDLE_W: 32,  ATK_S: 33,   ATK_E2: 34,  ATK_W: 35,
    WALK_N1: 48, WALK_N2: 49, WALK_W1: 50, WALK_W2: 51,
    ATK_N: 64,
};
