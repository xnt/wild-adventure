import { MAP_COLS, MAP_ROWS } from './constants.js';

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
