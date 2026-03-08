import { WorldFactory, WorldData, ChestPosition, StructurePlacement } from './worldFactory.js';

// We create a dummy scene-less factory for the singleton data generation.
// In a real Phaser environment, the factory would be used within a Scene.
const factory = new WorldFactory(null as any);
const worldData: WorldData = factory.generateWorldData();

/** Singleton map data — generated once, reused across restarts. */
export const mapData: number[][] = worldData.map;

/** Singleton chest positions — generated once alongside mapData. */
export const chestPositions: ChestPosition[] = worldData.chests;

/** Singleton structure placements — generated once alongside mapData. */
export const structurePlacements: StructurePlacement[] = worldData.structures;

export type { ChestPosition, StructurePlacement };
