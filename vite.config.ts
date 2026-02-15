import { defineConfig } from 'vite';

export default defineConfig({
  base: "/wild-adventure/",
  // Expose to all interfaces so containers can serve to the host
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,   // fall back to next port if taken
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    // Single-chunk output for simplicity; Phaser is big but it's fine
    chunkSizeWarningLimit: 2000,
  },
  // Vitest config (merges with Vite; jsdom for DOM/canvas, TS auto via Vite).
  // Simple setup for unit tests on pure funcs (Phaser mocked in tests).
  // Coverage: V8 provider (fast/TS-native), reports to console/HTML/JSON; include src/*,
  // exclude tests/mocks/types for clean metrics. Run via --coverage or npm run test:coverage.
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
      exclude: [
        'src/**/*.test.ts',
        'src/types.ts',  // Types only
        '**/node_modules/**',
        '**/vitest.setup.ts',  // Mocks
      ],
      reportsDirectory: './coverage',
    },
  },
});
