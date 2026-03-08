# World Factory for Wild Adventure

This skill describes the centralized world generation system.

## Overview

`WorldFactory` owns all overworld generation: terrain, chests, structures, obstacles, and spawn queries.

## Location

`src/worldFactory.ts`

## Responsibilities

| Method | Purpose |
|--------|---------|
| `generateWorldData()` | Creates terrain data, chest positions, structure placements |
| `buildObstacleLayer()` | Creates physics static group for collisions |
| `buildWorld()` | Combines terrain rendering + obstacle layer |
| `getValidSpawn()` | Finds walkable position (for enemies, player, etc.) |

## Usage in GameScene

```typescript
// Create factory
this.worldFactory = new WorldFactory(this);

// Define world data (can be from map.ts or custom)
this.worldData = {
    map: mapData,
    chests: chestPositions,
    structures: structurePlacements,
};

// Build the world
this.obstacleLayer = this.worldFactory.buildWorld(this.worldData);

// Get spawn point for enemies
const spawn = this.worldFactory.getValidSpawn(mapData, startX, startY, minDist);
```

## WorldData Structure

```typescript
interface WorldData {
    map: number[][];           // Tile data (0=grass, 1=tree, 2=rock)
    chests: { x: number; y: number }[];
    structures: StructurePlacement[];
}
```

## Structure Placement

Structures are decorative landmarks:
- Pyramid, Totem, Teepee, Castle, Temple of Time, Stonehenge, Cabin
- Placed in specific terrain zones (desert, snow, forest, etc.)

## Extending World Factory

To add new world features:

1. Add data to `WorldData` interface
2. Add generation logic in `generateWorldData()`
3. Add rendering/building in `buildWorld()`

## Testing

`worldFactory.test.ts` covers:
- Terrain generation
- Chest placement
- Structure placement
- Valid spawn finding
