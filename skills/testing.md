# Testing Wild Adventure

This skill describes testing patterns and conventions.

## Running Tests

```bash
npm test            # Watch mode
npm run test:run    # CI-style run
npm run test:coverage  # Coverage report
```

## Test File Convention

- `<target>.test.ts` placed alongside the source file
- Example: `playerController.test.ts` tests `playerController.ts`

## Mocking Phaser

Tests mock Phaser objects minimally:

```typescript
const mockScene = {
    physics: {
        add: {
            sprite: vi.fn().mockReturnValue({
                setDepth: vi.fn().mockReturnThis(),
                setVelocity: vi.fn(),
                // ... other methods as needed
            }),
            group: vi.fn().mockReturnValue({
                create: vi.fn(),
            }),
        },
    },
    input: {
        keyboard: {
            createCursorKeys: vi.fn(),
            addKeys: vi.fn(),
            addKey: vi.fn(),
        },
    },
    cameras: { main: { shake: vi.fn() } },
    time: { delayedCall: vi.fn() },
    anims: { exists: vi.fn(), create: vi.fn() },
};
```

## Testing Systems

```typescript
describe('MySystem', () => {
    let system: MySystem;
    let mockScene: any;

    beforeEach(() => {
        mockScene = { /* ... */ };
        system = new MySystem(mockScene);
    });

    it('initializes correctly', () => {
        system.init();
        expect(system.someState).toBeDefined();
    });

    it('handles update', () => {
        system.update(1000);
        // Assert behavior
    });
});
```

## Testing PlayerIntent

When testing components that consume `PlayerIntent`:

```typescript
const intent: PlayerIntent = { moveX: 1, moveY: 0, attack: false };
controller.update(1000, intent);
```

## Coverage

- Run `npm run test:coverage` for HTML report in `./coverage/`
- Focus on testing systems and utils (pure logic)
- GameScene tests verify orchestration

## Common Patterns

### Testing Callbacks

```typescript
it('calls callback on event', () => {
    const spy = vi.fn();
    system.onEvent = spy;
    system.triggerEvent();
    expect(spy).toHaveBeenCalled();
});
```

### Testing Private Methods

```typescript
// Use type assertion to access private members
(system as any).privateMethod();
```
