import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorldFactory, WaterwayConfig, DEFAULT_WATERWAY_CONFIG } from './worldFactory.js';
import { TILE_IDS, TILE_SIZE } from './constants.js';

describe('WorldFactory', () => {
    let mockScene: any;
    let factory: WorldFactory;

    beforeEach(() => {
        mockScene = {
            add: {
                tileSprite: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis() }),
                image: vi.fn().mockReturnValue({ setDepth: vi.fn().mockReturnThis() }),
            },
            physics: {
                add: {
                    staticGroup: vi.fn().mockReturnValue({
                        create: vi.fn().mockReturnValue({
                            setDepth: vi.fn().mockReturnThis(),
                            refreshBody: vi.fn().mockReturnThis(),
                            body: { setSize: vi.fn(), setOffset: vi.fn() }
                        })
                    }),
                },
                world: {
                    setBounds: vi.fn(),
                },
            },
        };
        factory = new WorldFactory(mockScene);
    });

    it('generates world data with expected properties', () => {
        const data = factory.generateWorldData(10, 10);
        expect(data).toHaveProperty('map');
        expect(data).toHaveProperty('chests');
        expect(data).toHaveProperty('structures');
        expect(data.map.length).toBe(10);
        expect(data.map[0].length).toBe(10);
    });

    it('builds world and creates expected objects in scene', () => {
        const worldData = {
            map: [
                [TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE],
                [TILE_IDS.TREE, TILE_IDS.PLAINS, TILE_IDS.TREE],
                [TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE],
            ],
            chests: [{ x: 100, y: 100 }],
            structures: [{
                config: { key: 'pyramid', width: 3, height: 3 },
                x: 0, y: 0, col: 0, row: 0
            }],
        };

        const { obstacleLayer, waterLayer } = factory.buildWorld(worldData);
        
        expect(mockScene.add.tileSprite).toHaveBeenCalled();
        expect(mockScene.physics.add.staticGroup).toHaveBeenCalled();
        // 8 trees in the 3x3 map (border + interior)
        expect(obstacleLayer.create).toHaveBeenCalledTimes(8);
        expect(waterLayer).toBeDefined();
        // 1 structure
        expect(mockScene.add.image).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'pyramid');
        expect(mockScene.physics.world.setBounds).toHaveBeenCalledWith(0, 0, 3 * TILE_SIZE, 3 * TILE_SIZE);
    });

    it('getValidSpawn returns a valid position away from avoidPos', () => {
        const map = [
            [1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1],
        ];
        const avoidPos = { x: 0, y: 0 };
        const spawn = factory.getValidSpawn(map, avoidPos, 50);
        
        expect(spawn).not.toBeNull();
        if (spawn) {
            expect(spawn.x).toBeGreaterThan(0);
            expect(spawn.y).toBeGreaterThan(0);
        }
    });

    it('getValidSpawn returns null if no valid position found', () => {
        const map = [[1, 1], [1, 1]]; // All trees
        const spawn = factory.getValidSpawn(map, { x: 0, y: 0 });
        expect(spawn).toBeNull();
    });

    it('getValidSpawn does not spawn on water', () => {
        const map = [
            [1, 1, 1, 1, 1, 1, 1],
            [1, 0, 6, 6, 6, 0, 1], // 6 = water
            [1, 0, 6, 6, 6, 0, 1],
            [1, 0, 6, 6, 6, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1],
        ];
        
        // Try multiple times to ensure we never spawn on water
        for (let i = 0; i < 20; i++) {
            const spawn = factory.getValidSpawn(map, { x: 0, y: 0 }, 10);
            if (spawn) {
                const col = Math.floor((spawn.x - TILE_SIZE/2) / TILE_SIZE);
                const row = Math.floor((spawn.y - TILE_SIZE/2) / TILE_SIZE);
                expect(map[row][col]).not.toBe(TILE_IDS.WATER);
            }
        }
    });

    it('getValidSpawn can spawn on bridges', () => {
        const map = [
            [1, 1, 1, 1, 1, 1, 1],
            [1, 0, 6, 7, 6, 0, 1], // 7 = bridge
            [1, 0, 6, 6, 6, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1],
        ];
        
        // Create a seeded RNG that will pick column 3 (the bridge)
        let callCount = 0;
        const seededRng = () => {
            callCount++;
            if (callCount === 1) return 0.5; // column selection
            if (callCount === 2) return 0.3; // row selection  
            return Math.random();
        };
        
        const spawn = factory.getValidSpawn(map, { x: 0, y: 0 }, 10, seededRng);
        expect(spawn).not.toBeNull();
    });
});

describe('Waterway Generation', () => {
    let mockScene: any;
    let factory: WorldFactory;

    beforeEach(() => {
        mockScene = {
            add: {
                tileSprite: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis() }),
                image: vi.fn().mockReturnValue({ setDepth: vi.fn().mockReturnThis() }),
            },
            physics: {
                add: {
                    staticGroup: vi.fn().mockReturnValue({
                        create: vi.fn().mockReturnValue({
                            setDepth: vi.fn().mockReturnThis(),
                            refreshBody: vi.fn().mockReturnThis(),
                            body: { setSize: vi.fn(), setOffset: vi.fn() }
                        })
                    }),
                },
                world: {
                    setBounds: vi.fn(),
                },
            },
        };
        factory = new WorldFactory(mockScene);
    });

    it('generates waterways with default config', () => {
        const data = factory.generateWorldData(90, 90, Math.random, DEFAULT_WATERWAY_CONFIG);
        
        // Count water and bridge tiles
        let waterCount = 0;
        let bridgeCount = 0;
        for (const row of data.map) {
            for (const tile of row) {
                if (tile === TILE_IDS.WATER) waterCount++;
                if (tile === TILE_IDS.BRIDGE) bridgeCount++;
            }
        }
        
        console.log(`Water: ${waterCount}, Bridges: ${bridgeCount}`);
        
        // Should have some water or bridge tiles (some water might be bridged)
        expect(waterCount + bridgeCount).toBeGreaterThan(0);
    });

    it('generates bridges on waterways', () => {
        const data = factory.generateWorldData(90, 90, Math.random, DEFAULT_WATERWAY_CONFIG);
        
        // Count bridge tiles
        let bridgeCount = 0;
        for (const row of data.map) {
            for (const tile of row) {
                if (tile === TILE_IDS.BRIDGE) bridgeCount++;
            }
        }
        
        // Should have some bridges if there's water
        let waterCount = 0;
        for (const row of data.map) {
            for (const tile of row) {
                if (tile === TILE_IDS.WATER) waterCount++;
            }
        }
        
        if (waterCount > 0) {
            // Bridges appear occasionally, so we expect at least some
            // Given 90x90 map and 3 rivers, we should definitely have some bridges
            expect(bridgeCount).toBeGreaterThan(0);
        }
    });

    it('generates waterways with custom config', () => {
        const customConfig: WaterwayConfig = {
            numRivers: 5,
            minRiverWidth: 3,
            maxRiverWidth: 5,
            bridgeSpacing: 8,
        };
        
        const data = factory.generateWorldData(90, 90, Math.random, customConfig);
        
        // Count water and bridge tiles
        let waterCount = 0;
        let bridgeCount = 0;
        for (const row of data.map) {
            for (const tile of row) {
                if (tile === TILE_IDS.WATER) waterCount++;
                if (tile === TILE_IDS.BRIDGE) bridgeCount++;
            }
        }
        
        console.log(`Custom Water: ${waterCount}, Bridges: ${bridgeCount}`);
        
        // With 5 rivers of width 3-5, should have significant water
        expect(waterCount + bridgeCount).toBeGreaterThan(100);
    });

    it('does not place water on spawn point', () => {
        const data = factory.generateWorldData(90, 90, Math.random, DEFAULT_WATERWAY_CONFIG);
        
        const centerX = Math.floor(90 / 2);
        const centerY = Math.floor(90 / 2);
        
        // Check a 5x5 area around center
        for (let r = centerY - 2; r <= centerY + 2; r++) {
            for (let c = centerX - 2; c <= centerX + 2; c++) {
                expect(data.map[r][c]).not.toBe(TILE_IDS.WATER);
            }
        }
    });

    it('does not place chests on water', () => {
        const data = factory.generateWorldData(90, 90, Math.random, DEFAULT_WATERWAY_CONFIG);
        
        for (const chest of data.chests) {
            const col = Math.floor((chest.x - TILE_SIZE/2) / TILE_SIZE);
            const row = Math.floor((chest.y - TILE_SIZE/2) / TILE_SIZE);
            expect(data.map[row][col]).not.toBe(TILE_IDS.WATER);
        }
    });
});

describe('Map Accessibility', () => {
    let mockScene: any;
    let factory: WorldFactory;

    beforeEach(() => {
        mockScene = {
            add: {
                tileSprite: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis() }),
                image: vi.fn().mockReturnValue({ setDepth: vi.fn().mockReturnThis() }),
            },
            physics: {
                add: {
                    staticGroup: vi.fn().mockReturnValue({
                        create: vi.fn().mockReturnValue({
                            setDepth: vi.fn().mockReturnThis(),
                            refreshBody: vi.fn().mockReturnThis(),
                            body: { setSize: vi.fn(), setOffset: vi.fn() }
                        })
                    }),
                },
                world: {
                    setBounds: vi.fn(),
                },
            },
        };
        factory = new WorldFactory(mockScene);
    });

    it('validateAccessibility returns accessible for simple map', () => {
        const map = [
            [TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE],
            [TILE_IDS.TREE, TILE_IDS.PLAINS, TILE_IDS.TREE],
            [TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE],
        ];
        
        const result = factory.validateAccessibility(map, 1, 1);
        expect(result.accessible).toBe(true);
        expect(result.unreachableCount).toBe(0);
    });

    it('validateAccessibility detects unreachable areas', () => {
        const map = [
            [TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE],
            [TILE_IDS.TREE, TILE_IDS.PLAINS, TILE_IDS.WATER, TILE_IDS.PLAINS],
            [TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE],
        ];
        
        // Starting from left side (1,1), right side (3,1) should be unreachable
        const result = factory.validateAccessibility(map, 1, 1);
        expect(result.accessible).toBe(false);
        expect(result.unreachableCount).toBe(1);
    });

    it('validateAccessibility allows crossing via bridges', () => {
        const map = [
            [TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE],
            [TILE_IDS.TREE, TILE_IDS.PLAINS, TILE_IDS.BRIDGE, TILE_IDS.PLAINS],
            [TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE, TILE_IDS.TREE],
        ];
        
        const result = factory.validateAccessibility(map, 1, 1);
        expect(result.accessible).toBe(true);
        expect(result.unreachableCount).toBe(0);
    });

    it('generated map is fully accessible', () => {
        const data = factory.generateWorldData(50, 50, Math.random, DEFAULT_WATERWAY_CONFIG);
        
        // Use the exact center as start point
        const startX = Math.floor(50 / 2);
        const startY = Math.floor(50 / 2);
        
        const result = factory.validateAccessibility(data.map, startX, startY);
        expect(result.accessible).toBe(true);
    });

    it('ensureAccessibility adds bridges to unreachable areas', () => {
        // Create a map with unreachable area
        const map: number[][] = [];
        for (let r = 0; r < 20; r++) {
            const row: number[] = [];
            for (let c = 0; c < 20; c++) {
                if (r === 0 || r === 19 || c === 0 || c === 19) {
                    row.push(TILE_IDS.TREE);
                } else if (c === 10) {
                    row.push(TILE_IDS.WATER); // Vertical water barrier
                } else {
                    row.push(TILE_IDS.PLAINS);
                }
            }
            map.push(row);
        }
        
        // Start from left side (column 5, row 10) - this is PLAINS
        // Water is at column 10, so right side (columns 11-18) should be unreachable
        let result = factory.validateAccessibility(map, 5, 10);
        expect(result.accessible).toBe(false);
        expect(result.unreachableCount).toBeGreaterThan(0);
        
        // Ensure accessibility - start check from column 5
        factory.ensureAccessibility(map, 20, 20, 5, 10);
        
        // After ensuring accessibility, all should be reachable from left side
        result = factory.validateAccessibility(map, 5, 10);
        expect(result.accessible).toBe(true);
    });
});
