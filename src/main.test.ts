// Tests for main.ts (matches file-under-test).
// Basic config check (mocks Phaser.Game to avoid constructor issues).
// Uses a local vi.mock so we never load real Phaser (avoids phaser3spectorjs etc.).

import { describe, it, expect, vi } from 'vitest';

const GameMock = vi.fn().mockImplementation(function Game() {});

// Minimal Scene constructor so GameScene can extend it when main.ts is loaded.
vi.mock('phaser', () => ({
  default: {
    Game: GameMock,
    Scene: class Scene {},
    AUTO: 1,
    Scale: { FIT: 1, CENTER_BOTH: 2 },
    Types: { Core: { GameConfig: Object } },
  },
}));

describe('main.ts', () => {
  it('config is valid GameConfig and initializes Phaser.Game', async () => {
    await import('./main');

    expect(GameMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 1,
        width: 1024,
        height: 768,
        scene: expect.any(Array),
      }),
    );
  });
});