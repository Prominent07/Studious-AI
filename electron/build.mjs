/**
 * Build script for Electron main + preload.
 * Uses esbuild (already a devDependency) to compile TypeScript → CommonJS.
 * Output: electron/main.cjs and electron/preload.cjs
 *
 * Run: node electron/build.mjs
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: ['electron'],
  sourcemap: true,
};

await Promise.all([
  build({
    ...shared,
    entryPoints: [path.join(__dirname, 'main.ts')],
    outfile: path.join(__dirname, 'main.cjs'),
  }),
  build({
    ...shared,
    entryPoints: [path.join(__dirname, 'preload.ts')],
    outfile: path.join(__dirname, 'preload.cjs'),
  }),
]);

console.log('✅ Electron main + preload compiled successfully.');
