import Phaser from 'phaser';
import {
    MAP_COLS, MAP_ROWS, TILE_SIZE, NUM_CHESTS, TILE_IDS,
    NUM_STRUCTURES, STRUCTURE_TYPES, StructureConfig,
} from './constants.js';

/** Configuration for waterway generation. */
export type WaterwayConfig = {
    numRivers: number;        // Number of rivers to generate
    minRiverWidth: number;    // Minimum width of a river (in tiles)
    maxRiverWidth: number;    // Maximum width of a river (in tiles)
    bridgeSpacing: number;    // Minimum distance between bridges (in tiles)
};

/** Default waterway configuration. */
export const DEFAULT_WATERWAY_CONFIG: WaterwayConfig = {
    numRivers: 3,
    minRiverWidth: 2,
    maxRiverWidth: 4,
    bridgeSpacing: 12,
};

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
        rng: () => number = Math.random,
        waterwayConfig: WaterwayConfig = DEFAULT_WATERWAY_CONFIG,
    ): WorldData {
        const map = this.generateMap(cols, rows, rng);
        this.generateWaterways(map, cols, rows, rng, waterwayConfig);
        this.generateBridges(map, cols, rows, rng, waterwayConfig);
        
        // Guarantee accessibility by ensuring the "plains cross" is clear of water
        // and has bridges where water exists.
        this.ensureCrossConnectivity(map, cols, rows);
        
        // Final safety check and correction for any remaining isolated pockets
        this.ensureAccessibility(map, cols, rows);

        // Ensure spawn point is clear of water and obstacles
        this.clearSpawnArea(map, cols, rows);

        const chests = this.generateChestPositions(map, NUM_CHESTS, cols, rows, rng);
        const structures = this.generateStructurePlacements(map, NUM_STRUCTURES, cols, rows, rng);

        return { map, chests, structures };
    }

    /**
     * Ensures that a grid of horizontal and vertical paths (the "connectivity grid") 
     * are walkable, adding bridges where they intersect water.
     */
    private ensureCrossConnectivity(map: number[][], cols: number, rows: number): void {
        const rowPoints = [
            Math.floor(rows / 4),
            Math.floor(rows / 2),
            Math.floor(3 * rows / 4)
        ];
        const colPoints = [
            Math.floor(cols / 4),
            Math.floor(cols / 2),
            Math.floor(3 * cols / 4)
        ];

        // Horizontal paths
        for (const rBase of rowPoints) {
            for (let c = 1; c < cols - 1; c++) {
                if (map[rBase][c] === TILE_IDS.WATER) {
                    map[rBase][c] = TILE_IDS.BRIDGE;
                }
                // Clear obstacles on a 2-tile wide path
                for (let dr = -1; dr <= 0; dr++) {
                    const r = rBase + dr;
                    if (map[r][c] === TILE_IDS.TREE || map[r][c] === TILE_IDS.ROCK) {
                        map[r][c] = TILE_IDS.PLAINS;
                    }
                }
            }
        }

        // Vertical paths
        for (const cBase of colPoints) {
            for (let r = 1; r < rows - 1; r++) {
                if (map[r][cBase] === TILE_IDS.WATER) {
                    map[r][cBase] = TILE_IDS.BRIDGE;
                }
                for (let dc = 0; dc <= 1; dc++) {
                    const c = cBase + dc;
                    if (map[r][c] === TILE_IDS.TREE || map[r][c] === TILE_IDS.ROCK) {
                        map[r][c] = TILE_IDS.PLAINS;
                    }
                }
            }
        }
    }

    /**
     * Builds the tilemap and obstacle layers in the scene.
     * Returns both the static obstacle layer (trees/rocks) and the water layer.
     */
    buildWorld(worldData: WorldData): { 
        obstacleLayer: Phaser.Physics.Arcade.StaticGroup, 
        waterLayer: Phaser.Physics.Arcade.StaticGroup 
    } {
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

        // Biome overlays (excluding water which is handled by waterLayer)
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

        // Layers
        const obstacleLayer = this.scene.physics.add.staticGroup();
        const waterLayer = this.scene.physics.add.staticGroup();

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tile = map[r][c];
                
                const tx = c * TILE_SIZE + TILE_SIZE / 2;
                const ty = r * TILE_SIZE + TILE_SIZE / 2;

                // Water is its own layer
                if (tile === TILE_IDS.WATER) {
                    const water = waterLayer.create(tx, ty, 'water');
                    water.setDepth(0.6);
                    water.refreshBody();
                    water.body!.setSize(TILE_SIZE, TILE_SIZE);
                    continue;
                }
                
                // Trees and rocks are obstacles
                if (tile === TILE_IDS.TREE || tile === TILE_IDS.ROCK) {
                    const key = tile === TILE_IDS.TREE ? 'tree' : 'rock';
                    const obs = obstacleLayer.create(tx, ty, key);
                    obs.setDepth(1);
                    obs.refreshBody();
                    obs.body!.setSize(28, 28);
                    obs.body!.setOffset(2, 2);
                }
            }
        }

        // Bridges (walkable over water)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (map[r][c] !== TILE_IDS.BRIDGE) continue;
                
                const tx = c * TILE_SIZE + TILE_SIZE / 2;
                const ty = r * TILE_SIZE + TILE_SIZE / 2;
                this.scene.add.image(tx, ty, 'bridge').setDepth(0.7);
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
        return { obstacleLayer, waterLayer };
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

            const tile = map[r][c];
            // Allow spawning on plains, forest, swamp, snow, and bridges
            // But not on water, trees, or rocks
            if (tile === TILE_IDS.WATER || tile === TILE_IDS.TREE || tile === TILE_IDS.ROCK) continue;
            if (tile !== TILE_IDS.PLAINS && tile !== TILE_IDS.FOREST && 
                tile !== TILE_IDS.SWAMP && tile !== TILE_IDS.SNOW && 
                tile !== TILE_IDS.BRIDGE) continue;

            const wx = c * TILE_SIZE + TILE_SIZE / 2;
            const wy = r * TILE_SIZE + TILE_SIZE / 2;

            if (Phaser.Math.Distance.Between(wx, wy, avoidPos.x, avoidPos.y) < minDist) continue;

            return { x: wx, y: wy };
        }
        return null;
    }

    /**
     * Finds a valid spawn position for an enemy in water.
     */
    getWaterSpawn(
        map: number[][],
        avoidPos: { x: number, y: number },
        minDist: number = 100,
        rng: () => number = Math.random
    ): { x: number, y: number } | null {
        const rows = map.length;
        const cols = map[0]?.length || 0;
        
        for (let i = 0; i < 100; i++) {
            const c = Math.floor(rng() * (cols - 2)) + 1;
            const r = Math.floor(rng() * (rows - 2)) + 1;

            if (map[r][c] === TILE_IDS.WATER) {
                const wx = c * TILE_SIZE + TILE_SIZE / 2;
                const wy = r * TILE_SIZE + TILE_SIZE / 2;

                if (Phaser.Math.Distance.Between(wx, wy, avoidPos.x, avoidPos.y) < minDist) continue;

                return { x: wx, y: wy };
            }
        }
        return null;
    }

    /**
     * Clears any water or obstacles in a 5x5 area around the spawn point.
     */
    private clearSpawnArea(map: number[][], cols: number, rows: number): void {
        const cx = Math.floor(cols / 2);
        const cy = Math.floor(rows / 2);
        for (let r = cy - 2; r <= cy + 2; r++) {
            if (r < 0 || r >= rows) continue;
            for (let c = cx - 2; c <= cx + 2; c++) {
                if (c < 0 || c >= cols) continue;
                
                // Boundaries are trees, keep them
                if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) continue;

                if (map[r][c] === TILE_IDS.WATER || map[r][c] === TILE_IDS.TREE || map[r][c] === TILE_IDS.ROCK) {
                    map[r][c] = TILE_IDS.PLAINS;
                }
            }
        }
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

            const tile = map[r][c];
            // Don't place on obstacles or water
            if (tile === TILE_IDS.TREE || tile === TILE_IDS.ROCK || tile === TILE_IDS.WATER) continue;
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
                        // Also avoid water for structures
                        if (tile === TILE_IDS.TREE || tile === TILE_IDS.ROCK || tile === TILE_IDS.WATER) {
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

    /**
     * Generate waterways (rivers) across the map.
     * Rivers are generated as meandering paths that flow across the map.
     */
    private generateWaterways(
        map: number[][],
        cols: number,
        rows: number,
        rng: () => number,
        config: WaterwayConfig,
    ): void {
        const centerX = Math.floor(cols / 2);
        const centerY = Math.floor(rows / 2);
        // Reduce safe zone for smaller maps to ensure water is generated in tests
        const safeZone = Math.min(5, Math.floor(Math.min(cols, rows) / 10));

        for (let i = 0; i < config.numRivers; i++) {
            const width = Math.floor(rng() * (config.maxRiverWidth - config.minRiverWidth + 1)) + config.minRiverWidth;
            
            // Randomly choose horizontal or vertical river
            const isHorizontal = rng() > 0.5;
            
            if (isHorizontal) {
                // Horizontal river (flows left to right)
                const startRow = Math.floor(rng() * (rows - 10)) + 5;
                
                // Skip if too close to center
                if (Math.abs(startRow - centerY) < safeZone) continue;
                
                let currentRow = startRow;
                for (let c = 1; c < cols - 1; c++) {
                    // Skip center area
                    if (Math.abs(c - centerX) < safeZone && Math.abs(currentRow - centerY) < safeZone) {
                        continue;
                    }
                    
                    // Carve the river with width
                    for (let w = 0; w < width; w++) {
                        const r = currentRow + w;
                        if (r > 0 && r < rows - 1) {
                            map[r][c] = TILE_IDS.WATER;
                        }
                    }
                    
                    // Meander occasionally
                    if (rng() < 0.15) {
                        const drift = rng() < 0.5 ? -1 : 1;
                        const newRow = currentRow + drift;
                        if (newRow > 3 && newRow < rows - width - 3) {
                            currentRow = newRow;
                        }
                    }
                }
            } else {
                // Vertical river (flows top to bottom)
                const startCol = Math.floor(rng() * (cols - 10)) + 5;
                
                // Skip if too close to center
                if (Math.abs(startCol - centerX) < safeZone) continue;
                
                let currentCol = startCol;
                for (let r = 1; r < rows - 1; r++) {
                    // Skip center area
                    if (Math.abs(currentCol - centerX) < safeZone && Math.abs(r - centerY) < safeZone) {
                        continue;
                    }
                    
                    // Carve the river with width
                    for (let w = 0; w < width; w++) {
                        const c = currentCol + w;
                        if (c > 0 && c < cols - 1) {
                            map[r][c] = TILE_IDS.WATER;
                        }
                    }
                    
                    // Meander occasionally
                    if (rng() < 0.15) {
                        const drift = rng() < 0.5 ? -1 : 1;
                        const newCol = currentCol + drift;
                        if (newCol > 3 && newCol < cols - width - 3) {
                            currentCol = newCol;
                        }
                    }
                }
            }
        }
    }

    /**
     * Generate bridges across waterways to ensure map connectivity.
     * Bridges are placed occasionally along rivers.
     */
    private generateBridges(
        map: number[][],
        cols: number,
        rows: number,
        rng: () => number,
        config: WaterwayConfig,
    ): void {
        // Horizontal bridges (crossing vertical rivers)
        // Scan every Nth row to reduce bridge frequency
        const scanInterval = 15;
        for (let r = scanInterval; r < rows - scanInterval; r += scanInterval) {
            let waterStart = -1;
            let waterLength = 0;
            
            for (let c = 1; c < cols - 1; c++) {
                if (map[r][c] === TILE_IDS.WATER) {
                    if (waterStart === -1) {
                        waterStart = c;
                    }
                    waterLength++;
                } else {
                    if (waterStart !== -1 && waterLength >= 2 && waterLength <= config.maxRiverWidth + 2) {
                        // Place a bridge with some probability
                        if (rng() < 0.4) {
                            const bridgePos = waterStart + Math.floor(waterLength / 2);
                            map[r][bridgePos] = TILE_IDS.BRIDGE;
                        }
                    }
                    waterStart = -1;
                    waterLength = 0;
                }
            }
        }
        
        // Vertical bridges (crossing horizontal rivers)
        for (let c = scanInterval; c < cols - scanInterval; c += scanInterval) {
            let waterStart = -1;
            let waterLength = 0;
            
            for (let r = 1; r < rows - 1; r++) {
                if (map[r][c] === TILE_IDS.WATER) {
                    if (waterStart === -1) {
                        waterStart = r;
                    }
                    waterLength++;
                } else {
                    if (waterStart !== -1 && waterLength >= 2 && waterLength <= config.maxRiverWidth + 2) {
                        if (rng() < 0.4) {
                            const bridgePos = waterStart + Math.floor(waterLength / 2);
                            map[bridgePos][c] = TILE_IDS.BRIDGE;
                        }
                    }
                    waterStart = -1;
                    waterLength = 0;
                }
            }
        }
    }

    /**
     * Check if all walkable tiles are accessible from the spawn point.
     * Uses flood fill to verify connectivity through bridges.
     * Returns true if all walkable tiles are reachable.
     */
    validateAccessibility(
        map: number[][],
        startCol: number,
        startRow: number,
    ): { accessible: boolean; unreachableCount: number; unreachableTiles: Array<{col: number, row: number}> } {
        const rows = map.length;
        const cols = map[0]?.length || 0;
        const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
        
        // Tiles that can be walked on
        const isWalkable = (tile: number): boolean => {
            return tile !== TILE_IDS.TREE && 
                   tile !== TILE_IDS.ROCK && 
                   tile !== TILE_IDS.WATER;
        };
        
        // BFS flood fill from start position
        const queue: Array<{col: number, row: number}> = [{ col: startCol, row: startRow }];
        visited[startRow][startCol] = true;
        
        const directions = [
            { dc: 0, dr: -1 }, // up
            { dc: 0, dr: 1 },  // down
            { dc: -1, dr: 0 }, // left
            { dc: 1, dr: 0 },  // right
        ];
        
        while (queue.length > 0) {
            const { col, row } = queue.shift()!;
            
            for (const { dc, dr } of directions) {
                const newCol = col + dc;
                const newRow = row + dr;
                
                // Check bounds
                if (newCol < 0 || newCol >= cols || newRow < 0 || newRow >= rows) continue;
                
                // Skip if already visited
                if (visited[newRow][newCol]) continue;
                
                // Check if walkable
                if (isWalkable(map[newRow][newCol])) {
                    visited[newRow][newCol] = true;
                    queue.push({ col: newCol, row: newRow });
                }
            }
        }
        
        // Count unreachable walkable tiles
        const unreachableTiles: Array<{col: number, row: number}> = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (isWalkable(map[r][c]) && !visited[r][c]) {
                    unreachableTiles.push({ col: c, row: r });
                }
            }
        }
        
        return {
            accessible: unreachableTiles.length === 0,
            unreachableCount: unreachableTiles.length,
            unreachableTiles,
        };
    }

    /**
     * Ensure map accessibility by adding more bridges if needed.
     * This is called after initial bridge generation to guarantee connectivity.
     */
    ensureAccessibility(
        map: number[][],
        cols: number,
        rows: number,
        startCol?: number,
        startRow?: number,
    ): void {
        const centerX = startCol ?? Math.floor(cols / 2);
        const centerY = startRow ?? Math.floor(rows / 2);
        
        // Find nearest walkable tile for start
        let actualStartX = centerX;
        let actualStartY = centerY;
        
        const isWalkable = (tile: number): boolean => 
            tile !== TILE_IDS.WATER && tile !== TILE_IDS.TREE && tile !== TILE_IDS.ROCK;

        if (!isWalkable(map[centerY]?.[centerX])) {
            let found = false;
            for (let radius = 1; radius < Math.max(cols, rows) && !found; radius++) {
                for (let dr = -radius; dr <= radius && !found; dr++) {
                    for (let dc = -radius; dc <= radius && !found; dc++) {
                        const r = centerY + dr;
                        const c = centerX + dc;
                        if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1 && isWalkable(map[r][c])) {
                            actualStartX = c;
                            actualStartY = r;
                            found = true;
                        }
                    }
                }
            }
        }
        
        let result = this.validateAccessibility(map, actualStartX, actualStartY);
        let iterations = 0;
        const maxIterations = 200;
        
        while (!result.accessible && iterations < maxIterations) {
            iterations++;
            
            // Try to connect the first unreachable tile back to the reachable area
            const unreachable = result.unreachableTiles[0];
            const connected = this.connectPockets(map, cols, rows, actualStartX, actualStartY, unreachable);
            
            if (!connected) break;
            
            result = this.validateAccessibility(map, actualStartX, actualStartY);
        }
    }

    /**
     * Connects an unreachable pocket to the reachable area by finding the shortest
     * path and clearing/bridging it.
     */
    private connectPockets(
        map: number[][],
        cols: number,
        rows: number,
        startX: number,
        startY: number,
        target: {col: number, row: number}
    ): boolean {
        // BFS to find the nearest reachable tile from the target unreachable tile
        const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
        const queue: Array<{col: number, row: number, parent: any}> = [{ col: target.col, row: target.row, parent: null }];
        visited[target.row][target.col] = true;
        
        const directions = [
            { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
            { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
        ];
        
        // Use a simple BFS to find ANY reachable tile
        // We consider everything traversable for this search
        let foundNode = null;
        
        // We'll use a separate BFS from the start point to mark reachable tiles
        const reachable = this.validateAccessibility(map, startX, startY).visited;
        // Wait, I need to modify validateAccessibility to return the visited map
        
        // Actually, just find the nearest tile that IS reachable
        while (queue.length > 0) {
            const curr = queue.shift()!;
            
            // If this tile is reachable from start, we've found our connection point!
            // We use a simple check: can it reach the start? 
            // Better: is it part of the reachable set from the previous validateAccessibility call?
            // Since I don't have the visited set here, I'll just check if it's reachable via a quick BFS
            if (this.isTileReachable(map, curr.col, curr.row, startX, startY)) {
                foundNode = curr;
                break;
            }

            for (const { dc, dr } of directions) {
                const nc = curr.col + dc;
                const nr = curr.row + dr;
                if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited[nr][nc]) {
                    visited[nr][nc] = true;
                    queue.push({ col: nc, row: nr, parent: curr });
                }
            }
        }

        if (foundNode) {
            // Path found! Backtrack and clear/bridge everything on the path.
            let curr = foundNode;
            while (curr) {
                const tile = map[curr.row][curr.col];
                if (tile === TILE_IDS.WATER) map[curr.row][curr.col] = TILE_IDS.BRIDGE;
                else if (tile === TILE_IDS.TREE || tile === TILE_IDS.ROCK) map[curr.row][curr.col] = TILE_IDS.PLAINS;
                curr = curr.parent;
            }
            return true;
        }

        return false;
    }

    private isTileReachable(map: number[][], startC: number, startR: number, destC: number, destR: number): boolean {
        // Quick BFS to check if start can reach dest through ALREADY walkable tiles
        const rows = map.length;
        const cols = map[0].length;
        const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
        const queue = [{ c: startC, r: startR }];
        visited[startR][startC] = true;

        const isWalkable = (tile: number) => tile !== TILE_IDS.WATER && tile !== TILE_IDS.TREE && tile !== TILE_IDS.ROCK;
        if (!isWalkable(map[startR][startC])) return false;

        while (queue.length > 0) {
            const { c, r } = queue.shift()!;
            if (c === destC && r === destR) return true;

            for (const { dc, dr } of [{ dc: 0, dr: 1 }, { dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: -1, dr: 0 }]) {
                const nc = c + dc;
                const nr = r + dr;
                if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited[nr][nc] && isWalkable(map[nr][nc])) {
                    visited[nr][nc] = true;
                    queue.push({ c: nc, r: nr });
                }
            }
        }
        return false;
    }
}
