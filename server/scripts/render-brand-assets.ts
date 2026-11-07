/**
 * Generates the static brand files in client/public from favicon.svg and the OG renderer:
 * PWA icons, the Apple touch icon and the landing page's link preview.
 *
 *   npm run brand:render -w server
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolvePalette } from '@chakyruu/shared';
import sharp from 'sharp';
import { ogCard } from '../src/og/cards.js';
import { OG_SIZE, renderPng } from '../src/og/render.js';

const PUBLIC_DIR = fileURLToPath(new URL('../../client/public/', import.meta.url));
const BURGUNDY = '#7A1F2B';
/** Maskable icons are cropped to a circle: the mark stays inside the central 80 %. */
const MASKABLE_SAFE_SCALE = 0.6;

async function icon(svg: Buffer, size: number): Promise<Buffer> {
  return sharp(svg, { density: (72 * size) / 32 }).resize(size, size).png().toBuffer();
}

async function maskableIcon(svg: Buffer, size: number): Promise<Buffer> {
  const inner = Math.round(size * MASKABLE_SAFE_SCALE);
  const mark = await icon(svg, inner);
  return sharp({ create: { width: size, height: size, channels: 4, background: BURGUNDY } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function main(): Promise<void> {
  const svg = await readFile(new URL('favicon.svg', `file://${PUBLIC_DIR}`));
  await mkdir(`${PUBLIC_DIR}icons`, { recursive: true });
  const files: [string, Buffer][] = [
    ['icons/icon-192.png', await icon(svg, 192)],
    ['icons/icon-512.png', await icon(svg, 512)],
    ['icons/maskable-512.png', await maskableIcon(svg, 512)],
    ['icons/apple-touch-icon.png', await maskableIcon(svg, 180)],
    [
      'og-landing.png',
      await renderPng(
        ogCard({
          eyebrow: 'ЭЛЕКТРОНДУК ТОЙ ЧАКЫРУУЛАРЫ',
          names: 'Chakyruu.kg',
          inviteLine: '',
          dateLine: 'Тойго заманбап чакыруу — 5 мүнөттө',
          venue: 'Түзүү — акысыз · Боз үй анимациясы · Музыка · Жооптор',
          scanLine: '',
          palette: resolvePalette('classic', null),
        }),
        OG_SIZE,
      ),
    ],
  ];
  for (const [name, data] of files) {
    await writeFile(`${PUBLIC_DIR}${name}`, data);
    console.info(`${name}: ${(data.length / 1024).toFixed(1)} KB`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
