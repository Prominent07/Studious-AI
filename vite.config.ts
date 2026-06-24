import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Tailwind v3 is handled via PostCSS (postcss.config.js) — no Vite plugin needed.

export default defineConfig(() => {
  return {
    // base './' is required for Electron production builds (file:// protocol)
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
