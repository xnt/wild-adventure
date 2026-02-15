// Tests for map.ts (matches file-under-test convention).
// Basic checks for map gen bounds/validity; expand in iterations.
// Run via Vitest (setup mocks Phaser/DOM as needed, though pure here).

import { describe, it, expect } from 'vitest';
import { MAP_COLS, MAP_ROWS } from './constants.js';  // .js specifier for TS/imports
import { generateMap, mapData } from './map.js';

describe('map.ts', () => {
  it('generateMap produces grid within MAP_COLS x MAP_ROWS bounds', () => {
    const cols = 10;
    const rows = 15;
    const map = generateMap(cols, rows);

    expect(map).toHaveLength(rows);  // Rows
    expect(map[0]).toHaveLength(cols);  // Cols in first row
    expect(map.every((row) => row.length === cols)).toBe(true);
  });

  it('mapData singleton matches default MAP_COLS/MAP_ROWS', () => {
    expect(mapData).toHaveLength(MAP_ROWS);
    expect(mapData[0]).toHaveLength(MAP_COLS);
    expect(mapData.every((row) => row.length === MAP_COLS)).toBe(true);
  });

  it('map tiles are valid (0=grass, 1=tree, 2=rock)', () => {
    mapData.forEach((row) => {
      row.forEach((tile) => {
        expect([0, 1, 2]).toContain(tile);
      });
    });
  });
});