import {
    MAP_COLS, MAP_ROWS, TILE_SIZE, NUM_CHESTS, TILE_IDS,
    NUM_STRUCTURES, STRUCTURE_TYPES, StructureConfig,
} from './constants.js';

// ---------------------------------------------------------------------------
// Procedural Map Generation (biomes + obstacles)
// Tile types: plains/forest/swamp/snow + obstacles (tree/rock)
// ---------------------------------------------------------------------------

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const getBiomeForCell = (c: number, r: number, cols: number, rows: number): number => {
    const nx = c / Math.max(1, cols - 1);
    const ny = r / Math.max(1, rows - 1);

    const tempWave = Math.sin((nx * 2.2) + (ny * 1.4) + 0.6);
    const humidWave = Math.sin((nx * 1.7) - (ny * 2.1) + 1.8);

    const temperature = clamp01(0.5 + 0.5 * tempWave + (nx - 0.5) * 0.12);
    const humidity = clamp01(0.5 + 0.5 * humidWave - (ny - 0.5) * 0.1);

    if (temperature < 0.35) return TILE_IDS.SNOW;
    if (humidity > 0.65) return TILE_IDS.SWAMP;
    if (humidity > 0.48) return TILE_IDS.FOREST;
    return TILE_IDS.PLAINS;
};

const getObstacleTile = (biome: number, rng: number): number => {
    if (biome === TILE_IDS.FOREST && rng < 0.25) return TILE_IDS.TREE;
    if (biome === TILE_IDS.SWAMP && rng < 0.12) return TILE_IDS.TREE;
    if (biome === TILE_IDS.SNOW && rng < 0.18) return TILE_IDS.ROCK;
    if (biome === TILE_IDS.PLAINS && rng < 0.10) return TILE_IDS.ROCK;
    return biome;
};

/**
 * Generate a randomised tilemap array.
 * Biomes are chosen by a simple noise-like function and obstacles are
 * sprinkled based on biome density. A clear 5×5 area is left around the
 * player spawn point.
 */
// Added TypeScript types here (and to mapData below) to validate transpilation,
// type safety for tile values, and integration with Vite.
export const generateMap = (cols: number = MAP_COLS, rows: number = MAP_ROWS): number[][] => {
    const map = [];

    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            // Border walls stay forested for a natural boundary.
            if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                row.push(TILE_IDS.TREE);
                continue;
            }
            // Clear spawn area around centre
            const cx = Math.floor(cols / 2);
            const cy = Math.floor(rows / 2);
            if (Math.abs(c - cx) < 3 && Math.abs(r - cy) < 3) {
                row.push(TILE_IDS.PLAINS);
                continue;
            }

            const biome = getBiomeForCell(c, r, cols, rows);
            row.push(getObstacleTile(biome, Math.random()));
        }
        map.push(row);
    }

    // Carve cross-paths through the centre (plains)
    const midR = Math.floor(rows / 2);
    const midC = Math.floor(cols / 2);
    for (let c = 1; c < cols - 1; c++) {
        map[midR][c]     = TILE_IDS.PLAINS;
        map[midR - 1][c] = TILE_IDS.PLAINS;
    }
    for (let r = 1; r < rows - 1; r++) {
        map[r][midC]     = TILE_IDS.PLAINS;
        map[r][midC + 1] = TILE_IDS.PLAINS;
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
 * Pick `count` random walkable tile positions for chests, spread across the map.
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

        // Must be walkable terrain
        if (map[r][c] === TILE_IDS.TREE || map[r][c] === TILE_IDS.ROCK) continue;

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

// ---------------------------------------------------------------------------
// Structure position generation (decorative landmarks)
// ---------------------------------------------------------------------------

/** Placed structure instance with position and config. */
export type StructurePlacement = {
    config: StructureConfig;
    x: number;  // world x (top-left of structure)
    y: number;  // world y (top-left of structure)
    col: number; // tile column
    row: number; // tile row
};

/**
 * Pick `count` random structures and place them on the map.
 * Structures are placed on walkable tiles, avoiding:
 * - Player spawn area (centre 7×7)
 * - Map borders
 * - Overlapping with each other
 * - Overlapping with obstacles (trees/rocks)
 *
 * Pure function (injectable rng for tests).
 */
export const generateStructurePlacements = (
    map: number[][],
    count: number = NUM_STRUCTURES,
    cols: number = MAP_COLS,
    rows: number = MAP_ROWS,
    rng: () => number = Math.random,
): StructurePlacement[] => {
    const placements: StructurePlacement[] = [];
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);

    // Shuffle and pick `count` unique structure types
    const shuffled = [...STRUCTURE_TYPES].sort(() => rng() - 0.5);
    const selectedTypes = shuffled.slice(0, count);

    for (const config of selectedTypes) {
        let attempts = 0;
        let placed = false;

        while (!placed && attempts < 200) {
            attempts++;

            // Pick random position (must fit structure within bounds)
            const c = Math.floor(rng() * (cols - config.width - 4)) + 2;
            const r = Math.floor(rng() * (rows - config.height - 4)) + 2;

            // Avoid spawn area (centre 7×7)
            if (Math.abs(c - cx) < 5 && Math.abs(r - cy) < 5) continue;
            if (Math.abs(c + config.width - cx) < 5 && Math.abs(r - cy) < 5) continue;

            // Check all tiles in structure footprint are walkable
            let allWalkable = true;
            for (let dr = 0; dr < config.height && allWalkable; dr++) {
                for (let dc = 0; dc < config.width && allWalkable; dc++) {
                    const tile = map[r + dr]?.[c + dc];
                    if (tile === TILE_IDS.TREE || tile === TILE_IDS.ROCK) {
                        allWalkable = false;
                    }
                }
            }
            if (!allWalkable) continue;

            // Check no overlap with existing placements (min separation)
            const wx = c * TILE_SIZE;
            const wy = r * TILE_SIZE;
            const overlaps = placements.some((p) => {
                const pRight = p.x + p.config.width * TILE_SIZE;
                const pBottom = p.y + p.config.height * TILE_SIZE;
                const newRight = wx + config.width * TILE_SIZE;
                const newBottom = wy + config.height * TILE_SIZE;
                // Add buffer of 2 tiles
                const buffer = 2 * TILE_SIZE;
                return !(wx >= pRight + buffer || newRight + buffer <= p.x ||
                         wy >= pBottom + buffer || newBottom + buffer <= p.y);
            });
            if (overlaps) continue;

            placements.push({
                config,
                x: wx,
                y: wy,
                col: c,
                row: r,
            });
            placed = true;
        }
    }

    return placements;
};

/** Singleton structure placements — generated once alongside mapData. */
export const structurePlacements: StructurePlacement[] = generateStructurePlacements(mapData);
