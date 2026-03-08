# Input System for Wild Adventure

This skill describes the device-agnostic input architecture.

## Overview

Input is abstracted into `PlayerIntent` objects, allowing keyboard, touch, and future gamepad support through a unified interface.

## Core Types

```typescript
interface PlayerIntent {
    moveX: number;   // -1 to 1 (normalized)
    moveY: number;   // -1 to 1 (normalized)
    attack: boolean; // one-shot attack intent
}

interface InputSource {
    getIntent(): PlayerIntent;
    update(): void;    // Called each frame to consume one-shot events
    destroy(): void;   // Cleanup event listeners
}
```

## Architecture

```
┌─────────────────────┐
│ KeyboardInputSource │──┐
└─────────────────────┘  │
┌─────────────────────┐  │    ┌──────────────────────┐
│ TouchInputSource    │──┼───▶│ CompositeInputSource │──▶ PlayerIntent
└─────────────────────┘  │    └──────────────────────┘
┌─────────────────────┐  │
│ GamepadInputSource  │──┘  (future)
└─────────────────────┘
```

## Usage in Game Loop

```typescript
update(time: number, delta: number): void {
    // Update input sources (consumes one-shot events like attack)
    this.inputSource.update();
    
    // Get unified intent
    const intent = this.inputSource.getIntent();
    
    // Pass to systems
    this.playerController.update(time, intent);
    this.combatSystem.update(time, x, y, facing, intent.attack);
}
```

## Adding a New Input Source

1. Create class implementing `InputSource`:
```typescript
export class GamepadInputSource implements InputSource {
    getIntent(): PlayerIntent { /* ... */ }
    update(): void { /* ... */ }
    destroy(): void { /* ... */ }
}
```
2. Add to `CompositeInputSource` in GameScene's `_initSystems()`

## Keyboard Zones

- **Movement**: WASD or Arrow keys
- **Attack**: Space

## Touch Zones

- **Left 70%**: Virtual joystick (drag to move)
- **Right 30%**: Attack button (tap to attack)

## Key Files

- `src/types.ts` - `PlayerIntent` and `InputSource` interfaces
- `src/systems/inputSources.ts` - All input source implementations
- `src/systems/playerController.ts` - Consumes `PlayerIntent`
