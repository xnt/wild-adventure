# Enemy Behaviors Skill

This guide documents the strategy-pattern based enemy AI system in Wild Adventure.

## Overview

Enemy AI is implemented using the **Strategy Pattern** - each enemy type has its own behavior class that encapsulates its unique AI logic. This makes it easy to:
- Add new enemy types without modifying existing code
- Test individual behaviors in isolation
- Share common behavior via the base class
- Override specific behaviors per enemy type

## Architecture

```
EnemySystem (orchestrates)
    |
    v
GameEnemy (has-a behavior)
    |
    v
EnemyBehavior (strategy interface)
    |
    +-- GoblinBehavior
    +-- WizrobeBehavior
    +-- LynelBehavior
    +-- GelBehavior
    +-- GelSmallBehavior
```

## File Structure

```
src/systems/enemyBehaviors/
├── base.ts           # BaseEnemyBehavior with shared logic
├── index.ts          # Factory function and exports
├── goblin.ts         # GoblinBehavior
├── wizrobe.ts        # WizrobeBehavior (shoots projectiles)
├── lynel.ts          # LynelBehavior
├── gel.ts            # GelBehavior (splits on death)
├── gelSmall.ts       # GelSmallBehavior
└── index.test.ts     # Comprehensive test suite
```

## BaseEnemyBehavior

The abstract base class provides shared functionality:

### `updateMovement(enemy, player, time)`
- Handles chase logic when player is within `CHASE_RANGE`
- Manages patrol behavior when player is out of range
- Sets velocity and visual tint based on state

### `applyBobbing(enemy, time, baseScale)`
- Applies subtle scale animation for visual interest
- Each enemy type uses different base scales

## Creating a New Enemy Behavior

### 1. Create the behavior file

Create a new file in `src/systems/enemyBehaviors/`:

```typescript
// src/systems/enemyBehaviors/myEnemy.ts
import type { GameEnemy, PositionedObject } from '../../types.js';
import { BaseEnemyBehavior } from './base.js';

export class MyEnemyBehavior extends BaseEnemyBehavior {
    update(enemy: GameEnemy, player: PositionedObject, time: number): boolean {
        if (enemy.isDying) return false;
        
        // Custom AI logic here
        this.updateMovement(enemy, player, time);
        this.applyBobbing(enemy, time, 1.0);
        
        // Return true if enemy should shoot this frame
        return false;
    }
    
    // Optional: handle special damage behavior
    onDamage?(enemy: GameEnemy, enemySystem: any): void {
        // Custom damage handling
    }
}
```

### 2. Export from index.ts

Add to `src/systems/enemyBehaviors/index.ts`:

```typescript
export { MyEnemyBehavior } from './myEnemy.js';

// Add to createBehavior factory
import { MyEnemyBehavior } from './myEnemy.js';

export function createBehavior(type: string): EnemyBehavior {
    switch (type) {
        // ... existing cases
        case 'my_enemy': return new MyEnemyBehavior();
        // ...
    }
}
```

### 3. Add enemy config

Add to `src/constants.ts` in `ENEMY_CONFIGS`:

```typescript
my_enemy: {
    texture: 'my_enemy',
    hp: 2,
    speedMult: 1.2,
    shoots: false,
    // Optional: projSpeed, shootCd for shooters
}
```

### 4. Add tests

Create tests in `src/systems/enemyBehaviors/index.test.ts`:

```typescript
describe('MyEnemyBehavior', () => {
    it('should behave correctly', () => {
        const behavior = new MyEnemyBehavior();
        // Test logic
    });
});
```

## Behavior Patterns

### Simple Chaser (Goblin, Lynel)

- Extends `BaseEnemyBehavior`
- Calls `updateMovement()` for chase/patrol
- Calls `applyBobbing()` with appropriate scale
- Returns `false` (doesn't shoot)

### Shooter (Wizrobe)

- Extends `BaseEnemyBehavior`
- Calls `updateMovement()` for movement
- Checks distance and cooldown for shooting
- Returns `true` when ready to shoot
- EnemySystem calls `enemyShoot()` when `update()` returns `true`

### Special Death (Gel)

- Implements `onDamage(enemy, enemySystem)`
- Called by EnemySystem when enemy takes damage
- Can trigger special effects like splitting

## Testing Tips

- Mock `Phaser.Math.Vector2` for `patrolTarget`
- Set `patrolTimer` and `patrolTarget` coordinates to avoid patrol edge cases
- Test both chase (player near) and patrol (player far) scenarios
- For shooters, test cooldown logic and range checks
- For special behaviors, test the `onDamage` hook

## Key Constants

- `CHASE_RANGE = 128` - Distance to start chasing player
- `CHASE_RANGE * 1.5` - Extended range for wizrobe shooting
- `ENEMY_SPEED = 50` - Base enemy speed (modified by `speedMult`)

## Integration with EnemySystem

EnemySystem delegates to behaviors:

```typescript
// EnemySystem.update()
update(time: number, player: PositionedObject): void {
    this.playerPos = player;
    (this.enemies.getChildren() as GameEnemy[]).forEach((enemy) => {
        if (enemy.behavior) {
            const shouldShoot = enemy.behavior.update(enemy, player, time);
            if (shouldShoot) {
                this.enemyShoot(enemy);
            }
        }
    });
}
```

This keeps EnemySystem focused on orchestration while behaviors handle AI logic.