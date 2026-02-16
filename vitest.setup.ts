// Vitest setup for Wild Adventure tests.
// Mocks Phaser globals and canvas APIs to enable simple unit tests on utils
// like generateMap/fallbacks without full game/Phaser runtime.
// (Iterate to add more mocks or vi.mock for Phaser in future.)
import { beforeEach, vi } from 'vitest';

// Mock canvas getContext (used in generatePlayerFallback) to avoid null/TS issues.
// Extended for Phaser's internal CanvasFeatures check (getImageData etc. on device init).
// Prevents real Phaser import side-effects when testing fallbacks.
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
  fillStyle: '',
  fillRect: vi.fn(),
  fillCircle: vi.fn(),
  fillTriangle: vi.fn(),
  clearRect: vi.fn(),
  // Phaser device checks:
  getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
  putImageData: vi.fn(),
  // Add more as needed for tests
})) as any;

// Full mock for 'phaser' to prevent real import (avoids missing optional deps like
// phaser3spectorjs [Phaser 3-era], WebGL init, etc.). Minimal stubs for Scene/Graphics/Math used in tests/utils.
// (Common for Phaser unit tests; works for v4 RC; expand or use phaser-test-utils in iteration.)
vi.mock('phaser', () => ({
  default: {
    GameObjects: {
      Graphics: vi.fn().mockImplementation(() => ({
        clear: vi.fn(),
        fillStyle: vi.fn(),
        fillRect: vi.fn(),
        fillCircle: vi.fn(),
        fillTriangle: vi.fn(),
        fillRoundedRect: vi.fn(),
        generateTexture: vi.fn(),
        destroy: vi.fn(),
      })),
    },
    // Scene must be a constructor so GameScene can extend it and call super().
    Scene: class Scene {
      add = {
        graphics: vi.fn().mockImplementation(() => ({
          clear: vi.fn(),
          fillStyle: vi.fn(),
          fillRect: vi.fn(),
          fillCircle: vi.fn(),
          fillTriangle: vi.fn(),
          fillRoundedRect: vi.fn(),
          generateTexture: vi.fn(),
          destroy: vi.fn(),
        })),
        tileSprite: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis() }),
        rectangle: vi.fn().mockReturnValue({ setScrollFactor: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis() }),
        text: vi.fn().mockReturnValue({ setScrollFactor: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), setOrigin: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis() }),
        image: vi.fn().mockReturnValue({ setScrollFactor: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis(), setTexture: vi.fn().mockReturnThis() }),
      };
      physics = {
        add: {
          sprite: vi.fn().mockReturnValue({
          setDepth: vi.fn().mockReturnThis(),
          setCollideWorldBounds: vi.fn().mockReturnThis(),
          setImmovable: vi.fn().mockReturnThis(),
          setTexture: vi.fn().mockReturnThis(),
          body: { setSize: vi.fn().mockReturnThis(), setOffset: vi.fn().mockReturnThis(), enable: true, setAllowGravity: vi.fn(), setImmovable: vi.fn(), velocity: { x: 0, y: 0 } },
          setVelocity: vi.fn(), setTint: vi.fn(), clearTint: vi.fn(), setScale: vi.fn().mockReturnThis(), setRotation: vi.fn(), play: vi.fn(), setAlpha: vi.fn(), destroy: vi.fn(),
          x: 0, y: 0, active: true,
        }),
          group: vi.fn().mockReturnValue({ add: vi.fn(), getChildren: vi.fn().mockReturnValue([]) }),
          staticGroup: vi.fn().mockReturnValue({
          create: vi.fn().mockReturnValue({ setDepth: vi.fn().mockReturnThis(), refreshBody: vi.fn(), body: { setSize: vi.fn(), setOffset: vi.fn() } }),
          add: vi.fn(),
        }),
          existing: vi.fn(),
          collider: vi.fn(),
          overlap: vi.fn(),
        },
        world: { setBounds: vi.fn() },
      };
      input = {
        keyboard: {
          createCursorKeys: vi.fn().mockReturnValue({ left: { isDown: false }, right: {}, up: {}, down: {} }),
          addKeys: vi.fn().mockReturnValue({ up: { isDown: false }, down: {}, left: {}, right: {} }),
          addKey: vi.fn().mockReturnValue({}),
          JustDown: vi.fn().mockReturnValue(false),
        },
        on: vi.fn(),
      };
      cameras = {
        main: {
          setBounds: vi.fn(),
          startFollow: vi.fn(),
          shake: vi.fn(),
          flash: vi.fn(),
        },
      };
      anims = {
        create: vi.fn(),
        exists: vi.fn().mockReturnValue(false),
        play: vi.fn(),
      };
      time = { delayedCall: vi.fn(), now: 1000 };
      tweens = { add: vi.fn() };
      load = { on: vi.fn(), spritesheet: vi.fn(), image: vi.fn() };
      textures = { exists: vi.fn().mockReturnValue(false), addSpriteSheet: vi.fn() };
      scene = { restart: vi.fn(), launch: vi.fn() };
      scale = { width: 1024, height: 768 };
    },
    // Math/Utils for utils calcs (Between, Angle, Random, Vector2).
    // Stubbed minimally for tests (returns numbers/vectors).
    Math: {
      Between: vi.fn().mockImplementation((min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min),
      Angle: {
        Between: vi.fn().mockImplementation((x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1)),
      },
      // For enemy AI (_updateEnemies extract): Distance, Clamp.
      Distance: {
        Between: vi.fn().mockImplementation((x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1)),
      },
      Clamp: vi.fn().mockImplementation((value: number, min: number, max: number) => Math.max(min, Math.min(max, value))),
      Vector2: class Vector2 { x: number; y: number; constructor(x: number, y: number) { this.x = x; this.y = y; } },
    },
    Utils: {
      Array: {
        GetRandom: vi.fn().mockImplementation((arr: any[]) => arr[0]),  // Deterministic for tests
      },
    },
    // Extend for GameScene/main tests: Scene methods (add, physics, input, cameras, anims, time, tweens)
    // for UI/lifecycle coverage. Stubs return mock objects/spies; deterministic.
    // (Phaser heavy render; mocks enable unit tests without full game.)
    Physics: {
      Arcade: {
        Sprite: vi.fn().mockImplementation((x, y, key) => ({
          x, y, setDepth: vi.fn().mockReturnThis(),
          setCollideWorldBounds: vi.fn().mockReturnThis(),
          body: { setSize: vi.fn().mockReturnThis(), setOffset: vi.fn().mockReturnThis(), enable: true, setAllowGravity: vi.fn(), setImmovable: vi.fn(), velocity: { x: 0, y: 0 } },
          setVelocity: vi.fn(), setTint: vi.fn(), clearTint: vi.fn(), setScale: vi.fn(), setRotation: vi.fn(), play: vi.fn(), setAlpha: vi.fn(),
          destroy: vi.fn(), active: true,
        })),
        // Groups, static etc.
        Group: vi.fn().mockImplementation(() => ({ add: vi.fn(), getChildren: vi.fn().mockReturnValue([]) })),
        StaticGroup: vi.fn().mockImplementation(() => ({ create: vi.fn().mockReturnValue({ setDepth: vi.fn(), refreshBody: vi.fn(), body: { setSize: vi.fn(), setOffset: vi.fn() } }), add: vi.fn() })),
      },
    },
    Input: {
      Keyboard: {
        KeyCodes: { W: 87, S: 83, A: 65, D: 68, SPACE: 32, R: 82 },  // For main/input tests
        JustDown: vi.fn().mockReturnValue(false),
      },
    },
    // Scene methods stubs
    Cameras: { Scene2D: { Camera: vi.fn() } },  // For main config
    // Extend as needed
  },
}));

// Reset mocks before each test for isolation.
beforeEach(() => {
  vi.clearAllMocks();
});

export {};