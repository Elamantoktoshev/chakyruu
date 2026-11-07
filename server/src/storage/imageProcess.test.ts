import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { HttpError } from '../lib/http.js';
import { detectImageType } from './image.js';
import { toWebp } from './imageProcess.js';

async function jpeg(width: number, height: number, withGps = false): Promise<Buffer> {
  const image = sharp({ create: { width, height, channels: 3, background: '#7a1f2b' } }).jpeg();
  return withGps ? image.withExif({ IFD0: { Copyright: 'secret-location' } }).toBuffer() : image.toBuffer();
}

describe('toWebp', () => {
  it('converts to webp and shrinks the longest side to 1600 px', async () => {
    const result = await toWebp(await jpeg(4000, 3000));
    expect(detectImageType(result.data)).toBe('webp');
    expect({ width: result.width, height: result.height }).toEqual({ width: 1600, height: 1200 });
  });

  it('does not enlarge small images', async () => {
    const result = await toWebp(await jpeg(800, 1200));
    expect({ width: result.width, height: result.height }).toEqual({ width: 800, height: 1200 });
  });

  it('honours a smaller limit for logos', async () => {
    const result = await toWebp(await jpeg(2000, 1000), { maxSize: 600 });
    expect(result.width).toBe(600);
  });

  it('drops EXIF metadata', async () => {
    const result = await toWebp(await jpeg(100, 100, true));
    const meta = await sharp(result.data).metadata();
    expect(meta.exif).toBeUndefined();
    expect(result.data.includes(Buffer.from('secret-location'))).toBe(false);
  });

  it('rejects data that only looks like an image', async () => {
    const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
    await expect(toWebp(fake)).rejects.toBeInstanceOf(HttpError);
  });

  it('makes typical photos much smaller', async () => {
    const noisy = await sharp(Buffer.alloc(3000 * 2000 * 3, 0).map((_, i) => (i * 7919) % 256), {
      raw: { width: 3000, height: 2000, channels: 3 },
    }).jpeg({ quality: 95 }).toBuffer();
    const result = await toWebp(noisy);
    expect(result.data.length).toBeLessThan(noisy.length / 2);
  });
});
