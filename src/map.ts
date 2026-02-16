import { MAP_COLS, MAP_ROWS, TILE_SIZE, NUM_CHESTS } from './constants.js';

// ---------------------------------------------------------------------------
// Procedural Map Generation (50×50)
// Tile types: 0 = grass, 1 = tree (impassable), 2 = rock (impassable)
// ---------------------------------------------------------------------------

/**
 * Generate a randomised tilemap array.
 * ~80 % grass, ~12 % trees, ~8 % rocks, with carved cross-paths through the
 * centre and a tree border wall.  A clear 5×5 area is left around the
 * player spawn point.
 */
// Added TypeScript types here (and to mapData below) to validate transpilation,
// type safety for tile values (0=grass,1=tree,2=rock), and integration with Vite.
export const generateMap = (cols: number = MAP_COLS, rows: number = MAP_ROWS): number[][] => {
    const map = [];

    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            // Border walls
            if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                row.push(1);
                continue;
            }
            // Clear spawn area around centre
            const cx = Math.floor(cols / 2);
            const cy = Math.floor(rows / 2);
            if (Math.abs(c - cx) < 3 && Math.abs(r - cy) < 3) {
                row.push(0);
                continue;
            }
            // Random fill
            const rnd = Math.random();
            if (rnd < 0.80)      row.push(0); // grass
            else if (rnd < 0.92) row.push(1); // tree
            else                 row.push(2); // rock
        }
        map.push(row);
    }

    // Carve cross-paths through the centre
    const midR = Math.floor(rows / 2);
    const midC = Math.floor(cols / 2);
    for (let c = 1; c < cols - 1; c++) {
        map[midR][c]     = 0;
        map[midR - 1][c] = 0;
    }
    for (let r = 1; r < rows - 1; r++) {
        map[r][midC]     = 0;
        map[r][midC + 1] = 0;
    }

    return map;
};

/** Singleton map data — generated once, reused across restarts. */
export const mapData: number[][] = generateMap();

// ---------------------------------------------------------------------------
// Chest position generation
// ---------------------------------------------------------------------------

/** World-space position for a chest. */
export type ChestPosition = { x: number; y: number };

/**
 * Pick `count` random grass-tile positions for chests, spread across the map.
 * Avoids the player spawn area (centre 5×5) and border tiles.
 * Positions are well-separated (min ~6 tiles apart) so chests feel scattered.
 *
 * Uses the provided mapData so chest positions are consistent with the
 * generated terrain.  Pure function (injectable rng for tests).
 */
export const generateChestPositions = (
    map: number[][],
    count: number = NUM_CHESTS,
    cols: number = MAP_COLS,
    rows: number = MAP_ROWS,
    rng: () => number = Math.random,
): ChestPosition[] => {
    const positions: ChestPosition[] = [];
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    const minSep = 6 * TILE_SIZE; // minimum separation between chests (px)

    let attempts = 0;
    while (positions.length < count && attempts < 1000) {
        attempts++;
        // Pick random interior tile (avoid border)
        const c = Math.floor(rng() * (cols - 4)) + 2;
        const r = Math.floor(rng() * (rows - 4)) + 2;

        // Must be grass
        if (map[r][c] !== 0) continue;

        // Avoid spawn area
        if (Math.abs(c - cx) < 4 && Math.abs(r - cy) < 4) continue;

        const wx = c * TILE_SIZE + TILE_SIZE / 2;
        const wy = r * TILE_SIZE + TILE_SIZE / 2;

        // Ensure separation from existing chests
        const tooClose = positions.some(
            (p) => Math.hypot(p.x - wx, p.y - wy) < minSep,
        );
        if (tooClose) continue;

        positions.push({ x: wx, y: wy });
    }

    return positions;
};

/** Singleton chest positions — generated once alongside mapData. */
export const chestPositions: ChestPosition[] = generateChestPositions(mapData);
