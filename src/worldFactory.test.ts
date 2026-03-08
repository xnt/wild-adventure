import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorldFactory } from './worldFactory.js';
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

        const obstacleLayer = factory.buildWorld(worldData);
        
        expect(mockScene.add.tileSprite).toHaveBeenCalled();
        expect(mockScene.physics.add.staticGroup).toHaveBeenCalled();
        // 8 trees in the 3x3 map (border + interior)
        expect(obstacleLayer.create).toHaveBeenCalledTimes(8);
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
});
