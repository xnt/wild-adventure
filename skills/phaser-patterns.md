# Phaser 4 Patterns for Wild Adventure

This skill provides Phaser-specific patterns used in the Wild Adventure codebase.

## Physics

- **Arcade only**: No matter, no complex bodies.
- **Collisions**: Use `this.physics.add.collider`, `overlap`, and velocity/position.
- **Static groups**: For obstacles, use `Phaser.Physics.Arcade.StaticGroup`.

## Camera

```typescript
// Follow player with lerp
this.cameras.main.startFollow(player, true, 0.15, 0.15);

// Set bounds from map
this.cameras.main.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
```

## Animations

- Created once, guarded against duplicates:
```typescript
if (!this.scene.anims.exists('idle_up')) {
    this.scene.anims.create({ key: 'idle_up', frames: [...], frameRate: 1 });
}
```
- **Naming convention**: `idle_*`, `walk_*`, `attack_*` with direction suffix (`up`, `down`, `left`, `right`).

## Spritesheets

- Player: 512×512 sheet, 32×32 frames, 16 columns.
- Frame indices in `constants.ts` as `FRAMES`.
- Fallback textures in `fallbacks/` draw canvas in same layout.

## Scene Lifecycle

```typescript
class MyScene extends Phaser.Scene {
    init(): void { /* Reset mutable state */ }
    preload(): void { /* Load assets */ }
    create(): void { /* Build world, init systems */ }
    update(time: number, delta: number): void { /* Game loop */ }
}
```

## Input (Device-Agnostic)

The game uses a unified `PlayerIntent` system:

```typescript
interface PlayerIntent {
    moveX: number;  // -1 to 1
    moveY: number;  // -1 to 1
    attack: boolean;
}
```

Input sources implement `InputSource` interface and emit `PlayerIntent`. See `src/systems/inputSources.ts`.
