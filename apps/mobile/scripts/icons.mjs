import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets', 'images');
const BG = '#03040D';
const glyph = await readFile(join(root, 'assets', 'brand', 'glyph.svg'), 'utf8');
const mono = glyph.replace(/stroke="[^"]+"/g, 'stroke="#fff"').replace(/fill="(?!none)[^"]+"/g, 'fill="#fff"');

// Glyph content spans roughly x 2.5-23.9 of the 24 viewBox; trim to a centred square.
const trim = (svg) => svg.replace('viewBox="0 0 24 24"', 'viewBox="-0.2 -0.2 24.4 24.4"');

async function glyphLayer(svg, size) {
  return sharp(Buffer.from(trim(svg)), { density: 600 })
    .resize(size, size)
    .png()
    .toBuffer();
}

async function place(file, canvas, glyphSize, svg, background) {
  const layer = await glyphLayer(svg, glyphSize);
  const offset = Math.round((canvas - glyphSize) / 2);
  let img = sharp({
    create: { width: canvas, height: canvas, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: layer, left: offset, top: offset }]);
  if (background) img = img.flatten({ background }).removeAlpha();
  await img.png().toFile(join(out, file));
  console.info(`wrote assets/images/${file}`);
}

await mkdir(out, { recursive: true });
await place('icon.png', 1024, 620, glyph, BG);
await place('android-icon-foreground.png', 1024, 560, glyph);
await place('android-icon-monochrome.png', 1024, 560, mono);
await place('splash-icon.png', 1024, 760, glyph);
await place('notification-icon.png', 96, 76, mono);
