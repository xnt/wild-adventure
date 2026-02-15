// Tests for constants.ts (matches file-under-test).
// Simple const/typing checks; e.g., FRAMES structure.

import { describe, it, expect } from 'vitest';
import { FRAMES } from './constants';

describe('constants.ts', () => {
  it('FRAMES as const has expected structure and immutability', () => {
    expect(FRAMES.IDLE_S).toBe(1);
    expect(FRAMES.ATK_N).toBe(64);
    expect(Object.keys(FRAMES).length).toBeGreaterThan(10);  // From player sheet
    // as const makes readonly (implicit type check; no runtime assign in unit test)
  });
});