import Phaser from 'phaser';
import {
    MAP_COLS, MAP_ROWS, TILE_SIZE, NUM_CHESTS, TILE_IDS,
    NUM_STRUCTURES, STRUCTURE_TYPES, StructureConfig,
} from './constants.js';

/** World-space position for a chest. */
export type ChestPosition = { x: number; y: number };

/** Placed structure instance with position and config. */
export type StructurePlacement = {
    config: StructureConfig;
    x: number;  // world x (top-left of structure)
    y: number;  // world y (top-left of structure)
    col: number; // tile column
    row: number; // tile row
};

export interface WorldData {
    map: number[][];
    chests: ChestPosition[];
    structures: StructurePlacement[];
}

export class WorldFactory {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Generates all procedural data for the world.
     */
    generateWorldData(
        cols: number = MAP_COLS,
        rows: number = MAP_ROWS,
        rng: () => number = Math.random
    ): WorldData {
        const map = this.generateMap(cols, rows, rng);
        const chests = this.generateChestPositions(map, NUM_CHESTS, cols, rows, rng);
        const structures = this.generateStructurePlacements(map, NUM_STRUCTURES, cols, rows, rng);

        return { map, chests, structures };
    }

    /**
     * Builds the tilemap and obstacle layer in the scene.
     */
    buildWorld(worldData: WorldData): Phaser.Physics.Arcade.StaticGroup {
        const { map } = worldData;
        const cols = map[0].length;
        const rows = map.length;

        // Base ground layer (plains)
        this.scene.add.tileSprite(
            0, 0,
            cols * TILE_SIZE, rows * TILE_SIZE,
            'grass',
        ).setOrigin(0, 0).setDepth(0);

        const biomeTextures: Record<number, string> = {
            [TILE_IDS.FOREST]: 'forest',
            [TILE_IDS.SWAMP]: 'swamp',
            [TILE_IDS.SNOW]: 'snow',
        };

        // Biome overlays
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tile = map[r][c];
                const texture = biomeTextures[tile];
                if (!texture) continue;

                const tx = c * TILE_SIZE + TILE_SIZE / 2;
                const ty = r * TILE_SIZE + TILE_SIZE / 2;
                this.scene.add.image(tx, ty, texture).setDepth(0.5);
            }
        }

        // Obstacles — static physics group of trees & rocks
        const obstacleLayer = this.scene.physics.add.staticGroup();

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tile = map[r][c];
                if (tile !== TILE_IDS.TREE && tile !== TILE_IDS.ROCK) continue;

                const tx = c * TILE_SIZE + TILE_SIZE / 2;
                const ty = r * TILE_SIZE + TILE_SIZE / 2;
                const key = tile === TILE_IDS.TREE ? 'tree' : 'rock';
                const obs = obstacleLayer.create(tx, ty, key);
                obs.setDepth(1);
                obs.refreshBody();
                obs.body!.setSize(28, 28);
                obs.body!.setOffset(2, 2);
            }
        }

        // Decorative structures
        for (const placement of worldData.structures) {
            const { config, x, y } = placement;
            const centerX = x + (config.width * TILE_SIZE) / 2;
            const centerY = y + (config.height * TILE_SIZE) / 2;

            const structure = this.scene.add.image(centerX, centerY, config.key);
            structure.setDepth(2);
        }

        this.scene.physics.world.setBounds(0, 0, cols * TILE_SIZE, rows * TILE_SIZE);
        return obstacleLayer;
    }

    /**
     * Finds a valid spawn position for an enemy.
     */
    getValidSpawn(
        map: number[][],
        avoidPos: { x: number, y: number },
        minDist: number = 200,
        rng: () => number = Math.random
    ): { x: number, y: number } | null {
        const rows = map.length;
        const cols = map[0]?.length || 0;
        
        // Try up to 50 times to find a valid spot
        for (let i = 0; i < 50; i++) {
            const c = Math.floor(rng() * (cols - 4)) + 2;
            const r = Math.floor(rng() * (rows - 4)) + 2;

            if (map[r][c] !== TILE_IDS.PLAINS && map[r][c] !== TILE_IDS.FOREST && 
                map[r][c] !== TILE_IDS.SWAMP && map[r][c] !== TILE_IDS.SNOW) continue;

            const wx = c * TILE_SIZE + TILE_SIZE / 2;
            const wy = r * TILE_SIZE + TILE_SIZE / 2;

            if (Phaser.Math.Distance.Between(wx, wy, avoidPos.x, avoidPos.y) < minDist) continue;

            return { x: wx, y: wy };
        }
        return null;
    }

    private generateMap(cols: number, rows: number, rng: () => number): number[][] {
        const map: number[][] = [];
        const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

        const getBiomeForCell = (c: number, r: number): number => {
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

        const getObstacleTile = (biome: number, rVal: number): number => {
            if (biome === TILE_IDS.FOREST && rVal < 0.25) return TILE_IDS.TREE;
            if (biome === TILE_IDS.SWAMP && rVal < 0.12) return TILE_IDS.TREE;
            if (biome === TILE_IDS.SNOW && rVal < 0.18) return TILE_IDS.ROCK;
            if (biome === TILE_IDS.PLAINS && rVal < 0.10) return TILE_IDS.ROCK;
            return biome;
        };

        for (let r = 0; r < rows; r++) {
            const row: number[] = [];
            for (let c = 0; c < cols; c++) {
                if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                    row.push(TILE_IDS.TREE);
                    continue;
                }
                const cx = Math.floor(cols / 2);
                const cy = Math.floor(rows / 2);
                if (Math.abs(c - cx) < 3 && Math.abs(r - cy) < 3) {
                    row.push(TILE_IDS.PLAINS);
                    continue;
                }

                const biome = getBiomeForCell(c, r);
                row.push(getObstacleTile(biome, rng()));
            }
            map.push(row);
        }

        const midR = Math.floor(rows / 2);
        const midC = Math.floor(cols / 2);
        for (let c = 1; c < cols - 1; c++) {
            map[midR][c] = TILE_IDS.PLAINS;
            map[midR - 1][c] = TILE_IDS.PLAINS;
        }
        for (let r = 1; r < rows - 1; r++) {
            map[r][midC] = TILE_IDS.PLAINS;
            map[r][midC + 1] = TILE_IDS.PLAINS;
        }

        return map;
    }

    private generateChestPositions(
        map: number[][],
        count: number,
        cols: number,
        rows: number,
        rng: () => number
    ): ChestPosition[] {
        const positions: ChestPosition[] = [];
        const cx = Math.floor(cols / 2);
        const cy = Math.floor(rows / 2);
        const minSep = 6 * TILE_SIZE;

        let attempts = 0;
        while (positions.length < count && attempts < 1000) {
            attempts++;
            const c = Math.floor(rng() * (cols - 4)) + 2;
            const r = Math.floor(rng() * (rows - 4)) + 2;

            if (map[r][c] === TILE_IDS.TREE || map[r][c] === TILE_IDS.ROCK) continue;
            if (Math.abs(c - cx) < 4 && Math.abs(r - cy) < 4) continue;

            const wx = c * TILE_SIZE + TILE_SIZE / 2;
            const wy = r * TILE_SIZE + TILE_SIZE / 2;

            const tooClose = positions.some(p => Math.hypot(p.x - wx, p.y - wy) < minSep);
            if (tooClose) continue;

            positions.push({ x: wx, y: wy });
        }
        return positions;
    }

    private generateStructurePlacements(
        map: number[][],
        count: number,
        cols: number,
        rows: number,
        rng: () => number
    ): StructurePlacement[] {
        const placements: StructurePlacement[] = [];
        const cx = Math.floor(cols / 2);
        const cy = Math.floor(rows / 2);

        const shuffled = [...STRUCTURE_TYPES].sort(() => rng() - 0.5);
        const selectedTypes = shuffled.slice(0, count);

        for (const config of selectedTypes) {
            let attempts = 0;
            let placed = false;

            while (!placed && attempts < 200) {
                attempts++;
                const c = Math.floor(rng() * (cols - config.width - 4)) + 2;
                const r = Math.floor(rng() * (rows - config.height - 4)) + 2;

                if (Math.abs(c - cx) < 5 && Math.abs(r - cy) < 5) continue;
                if (Math.abs(c + config.width - cx) < 5 && Math.abs(r - cy) < 5) continue;

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

                const wx = c * TILE_SIZE;
                const wy = r * TILE_SIZE;
                const overlaps = placements.some(p => {
                    const pRight = p.x + p.config.width * TILE_SIZE;
                    const pBottom = p.y + p.config.height * TILE_SIZE;
                    const newRight = wx + config.width * TILE_SIZE;
                    const newBottom = wy + config.height * TILE_SIZE;
                    const buffer = 2 * TILE_SIZE;
                    return !(wx >= pRight + buffer || newRight + buffer <= p.x ||
                             wy >= pBottom + buffer || newBottom + buffer <= p.y);
                });
                if (overlaps) continue;

                placements.push({ config, x: wx, y: wy, col: c, row: r });
                placed = true;
            }
        }
        return placements;
    }
}
