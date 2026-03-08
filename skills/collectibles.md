# Collectible System for Wild Adventure

This skill describes the unified collectible pipeline.

## Overview

All pickups (hearts, triforce pieces, compass, future items) go through a single `CollectibleSystem`.

## Types

```typescript
type CollectibleType = 'heart' | 'triforce_piece' | 'compass' | 'key' | 'potion';

interface CollectibleDefinition {
    type: CollectibleType;
    texture: string;
    label: string;
    onPickup?: (scene: any, collectible: GameCollectible) => void;
}
```

## Adding a New Collectible Type

1. Add type to `CollectibleType` in `src/types.ts`
2. Add definition to `CollectibleSystem.definitions` in `collectiblesSystem.ts`:
```typescript
key: {
    type: 'key',
    texture: 'key',
    label: 'Key',
    onPickup: (scene) => {
        // Apply effect
    }
}
```
3. Add fallback texture in `fallbacks/uiFallbacks.ts`
4. Load asset in `GameScene.preload()`

## Spawning Collectibles

```typescript
// Spawn a loose collectible in the world
collectibleSystem.spawnCollectible(x, y, 'heart');

// Chests automatically spawn their contents when opened
collectibleSystem.createChests(positions);
```

## Pickup Flow

1. Player overlaps collectible (or opens chest)
2. `collect()` called → applies effect via definition
3. Visual "pop" animation plays
4. Collectible destroyed

## Chest Contents

Defined in `constants.ts` as `CHEST_CONTENTS`:
```typescript
export const CHEST_CONTENTS: ChestContent[] = [
    { type: 'triforce_piece', label: 'Triforce of Courage' },
    { type: 'triforce_piece', label: 'Triforce of Wisdom' },
    { type: 'triforce_piece', label: 'Triforce of Power' },
    { type: 'compass', label: 'Compass' },
];
```
