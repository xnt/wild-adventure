// Tests for map.ts (matches file-under-test convention).
// Basic checks for map gen bounds/validity; expand in iterations.
// Run via Vitest (setup mocks Phaser/DOM as needed, though pure here).

import { describe, it, expect } from 'vitest';
import { MAP_COLS, MAP_ROWS, TILE_IDS } from './constants.js';
import { mapData } from './map.js';
import { WorldFactory } from './worldFactory.js';

describe('map.ts', () => {
  it('generateWorldData produces grid within MAP_COLS x MAP_ROWS bounds', () => {
    const factory = new WorldFactory(null as any);
    const cols = 10;
    const rows = 15;
    const data = factory.generateWorldData(cols, rows);

    expect(data.map).toHaveLength(rows);  // Rows
    expect(data.map[0]).toHaveLength(cols);  // Cols in first row
    expect(data.map.every((row) => row.length === cols)).toBe(true);
  });

  it('mapData singleton matches default MAP_COLS/MAP_ROWS', () => {
    expect(mapData).toHaveLength(MAP_ROWS);
    expect(mapData[0]).toHaveLength(MAP_COLS);
    expect(mapData.every((row) => row.length === MAP_COLS)).toBe(true);
  });

  it('map tiles are valid biome/obstacle ids', () => {
    const validTiles = Object.values(TILE_IDS);
    mapData.forEach((row) => {
      row.forEach((tile) => {
        expect(validTiles).toContain(tile);
      });
    });
  });
});