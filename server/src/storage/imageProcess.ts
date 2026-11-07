import sharp from 'sharp';
import { HttpError } from '../lib/http.js';

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
}

interface ProcessOptions {
  /** Longest side in pixels; smaller images are not enlarged. */
  maxSize?: number;
  quality?: number;
}

/** Invitation photos: sharp enough on any phone, light enough for 3G. */
export const PHOTO_MAX_SIZE = 1600;
/** Logos and tamada portraits are shown small. */
export const AVATAR_MAX_SIZE = 600;
const DEFAULT_QUALITY = 80;
/** A 10 MB JPEG is at most ~50 MP; refuse decompression bombs beyond that. */
const MAX_INPUT_PIXELS = 50_000_000;

/**
 * Re-encodes an uploaded (already magic-byte checked) image to webp:
 * applies the EXIF rotation, shrinks to `maxSize` and drops all metadata (GPS location, camera).
 */
export async function toWebp(input: Buffer, { maxSize = PHOTO_MAX_SIZE, quality = DEFAULT_QUALITY }: ProcessOptions = {}): Promise<ProcessedImage> {
  try {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
      .rotate()
      .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new HttpError(400, 'Could not read this image');
  }
}
