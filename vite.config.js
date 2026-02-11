import { defineConfig } from 'vite';

export default defineConfig({
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
});
