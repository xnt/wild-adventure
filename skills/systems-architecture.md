# Systems Architecture for Wild Adventure

This skill describes the decoupled system architecture used in the game.

## Overview

GameScene orchestrates systems. Systems own their state and provide callbacks for integration.

## System Pattern

```typescript
export class SomeSystem {
    scene: Phaser.Scene;
    // System-specific state
    
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }
    
    init(...deps): void { /* Initialize groups, setup */ }
    update(time: number, ...args): void { /* Per-frame logic */ }
    reset(): void { /* Clear state for restart */ }
    
    // Callbacks for external integration
    onSomeEvent?: (data: any) => void;
}
```

## Current Systems

| System | File | Responsibility |
|--------|------|----------------|
| `PlayerController` | `playerController.ts` | Movement, facing, animation, damage, HP |
| `CombatSystem` | `combatSystem.ts` | Attack timing, sword hitbox, cooldowns |
| `EnemySystem` | `enemySystem.ts` | Enemy spawning, AI, projectiles, drops |
| `UISystem` | `uiSystem.ts` | HUD hearts, enemy counter, overlays, compass |
| `CollectibleSystem` | `collectiblesSystem.ts` | Chests, triforce, compass, heart pickups |

## Input Sources (Device-Agnostic)

| Source | File | Device |
|--------|------|--------|
| `KeyboardInputSource` | `inputSources.ts` | Keyboard (WASD/arrows + space) |
| `TouchInputSource` | `inputSources.ts` | Touch (left 70% move, right 30% attack) |
| `CompositeInputSource` | `inputSources.ts` | Combines multiple sources |

## World Factory

`WorldFactory` centralizes world generation:
- `generateWorldData()` → terrain, chests, structures
- `buildObstacleLayer()` → physics group for collisions
- `getValidSpawn()` → find walkable positions

## Adding a New System

1. Create `src/systems/mySystem.ts`
2. Follow the system pattern above
3. Export from `src/systems/index.ts`
4. Import in GameScene, instantiate in `_initSystems()`
5. Call `update()` in GameScene's `update()` loop
6. Add tests in `mySystem.test.ts`

## Communication Between Systems

- **Callbacks**: Systems expose `onEvent` properties that GameScene wires up.
- **Direct calls**: GameScene can call system methods directly.
- **Shared state**: Avoid; prefer passing data through method arguments.

Example wiring in GameScene:
```typescript
this.enemySystem.onEnemyKilled = () => this._checkVictory();
this.collectibleSystem.onTriforceComplete = () => this._onTriforceComplete();
```
