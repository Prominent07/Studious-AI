import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Tailwind v3 is handled via PostCSS (postcss.config.js) — no Vite plugin needed.

export default defineConfig(() => {
  // base is /studious-ai/ on GitHub Pages, ./ for Electron, / for local dev
  const base = process.env.VITE_BASE_URL ?? './';

  return {
    base,
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
