import { MAX_IMAGE_BYTES } from '@chakyruu/shared';
import type { RequestHandler } from 'express';
import { HttpError } from '../lib/http.js';
import { removeQuietly } from './audioUpload.js';
import { detectImageType } from './image.js';
import { PHOTO_MAX_SIZE, toWebp } from './imageProcess.js';
import { receiveFile } from './receiveFile.js';
import type { StorageProvider, StoredFile } from './storage.provider.js';

/** Single image field (≤ 10 MB before re-encoding). */
export function receiveImage(field: string): RequestHandler {
  return receiveFile({ field, maxBytes: MAX_IMAGE_BYTES });
}

export interface StoredImage extends StoredFile {
  width: number;
  height: number;
}

/** Checks the magic bytes, re-encodes to webp (≤ maxSize px, no EXIF) and stores it. */
export async function storeImage(storage: StorageProvider, data: Buffer, maxSize: number = PHOTO_MAX_SIZE): Promise<StoredImage> {
  if (!detectImageType(data)) throw new HttpError(400, 'Only JPEG, PNG or WebP images are allowed');
  const image = await toWebp(data, { maxSize });
  const stored = await storage.save(image.data, 'webp');
  return { ...stored, width: image.width, height: image.height };
}

/** Stores the new image, saves its URL, then deletes the one it replaces. */
export async function replaceImage(
  storage: StorageProvider,
  data: Buffer,
  previousKey: string | null,
  save: (stored: StoredImage) => Promise<void>,
  maxSize: number = PHOTO_MAX_SIZE,
): Promise<StoredImage> {
  const stored = await storeImage(storage, data, maxSize);
  try {
    await save(stored);
  } catch (error: unknown) {
    // The row was not updated: the new file is an orphan.
    await removeQuietly(storage, stored.key);
    throw error;
  }
  if (previousKey) await removeQuietly(storage, previousKey);
  return stored;
}
