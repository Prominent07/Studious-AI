/**
 * Icon Generator — Studious AI
 * Run once: node scripts/generate-icons.mjs
 *
 * Requires: npm install --save-dev sharp
 * Reads:    assets/icon-source.png  (put your 1024×1024 source icon here)
 * Outputs:  public/icons/icon-*.png (all PWA sizes)
 *           assets/icon.png         (512×512 for electron-builder)
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SOURCE = path.join(root, 'assets', 'icon-source.png');
const PWA_OUT = path.join(root, 'public', 'icons');
const ELECTRON_OUT = path.join(root, 'assets');

const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function run() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`❌  Source icon not found at: ${SOURCE}`);
    console.error(`    Please place a 1024×1024 PNG at assets/icon-source.png`);
    process.exit(1);
  }

  fs.mkdirSync(PWA_OUT, { recursive: true });

  console.log('Generating PWA icons...');
  for (const size of PWA_SIZES) {
    await sharp(SOURCE)
      .resize(size, size)
      .png()
      .toFile(path.join(PWA_OUT, `icon-${size}.png`));
    console.log(`  ✅ icon-${size}.png`);
  }

  // 512×512 for electron-builder
  await sharp(SOURCE)
    .resize(512, 512)
    .png()
    .toFile(path.join(ELECTRON_OUT, 'icon.png'));
  console.log('  ✅ assets/icon.png (for Electron)');

  console.log('\nDone! All icons generated.');
}

run().catch(console.error);
