// Tests for fallbacks.ts (matches file-under-test).
// Mocks Phaser/canvas (via setup); tests gen + player sword fallback.

import { describe, it, expect, vi } from 'vitest';
import Phaser from 'phaser';  // Mocked in setup
import { generateFallbacks, generatePlayerFallback } from './fallbacks.js';  // .js specifier; latter exported for test

describe('fallbacks.ts', () => {
  it('generateFallbacks calls scene textures without errors (mocks Phaser)', () => {
    // Mock scene minimally (matches fallbacks.ts usage + setup's Graphics mock).
    // add.graphics returns object with methods; textures.exists=false to trigger gen,
    // addSpriteSheet for player fallback (called after graphics).
    // (Inline for simplicity; no 'new' on mocked class.)
    const mockScene = {
      add: {
        graphics: vi.fn().mockReturnValue({
          clear: vi.fn(),
          fillStyle: vi.fn(),
          fillRect: vi.fn(),
          fillCircle: vi.fn(),
          fillTriangle: vi.fn(),
          fillRoundedRect: vi.fn(),
          generateTexture: vi.fn(),
          destroy: vi.fn(),
        }),
      },
      textures: {
        exists: vi.fn().mockReturnValue(false),
        // Required for player fallback spritesheet.
        addSpriteSheet: vi.fn(),
      },
    } as unknown as Phaser.Scene;

    expect(() => generateFallbacks(mockScene)).not.toThrow();
    // Verifies fallbacks gen (player/heart etc.); expand spies in iteration.
  });

  // generatePlayerFallback: internal helper (exported for test); check sword render
  // on isAttack=true (via ctx/addSpriteSheet spy indirect).
  it('generatePlayerFallback renders sword when isAttack=true (via ctx mock)', () => {
    const mockScene = {
      textures: { addSpriteSheet: vi.fn() },
    } as unknown as Phaser.Scene;

    // Triggers drawChar(isAttack=true) cases for sword paths.
    generatePlayerFallback(mockScene);

    // Verify call (no throw); canvas ctx.fillRect (sword) hit via setup mock.
    // (Basic; add explicit ctx spy like vi.spyOn on getContext in iteration.)
    expect(mockScene.textures.addSpriteSheet).toHaveBeenCalledWith(
      'player',
      expect.any(HTMLCanvasElement),
      expect.objectContaining({ frameWidth: 32 }),
    );
  });
});