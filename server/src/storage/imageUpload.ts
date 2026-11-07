import type { RequestHandler } from 'express';
import multer from 'multer';
import { HttpError } from '../lib/http.js';
import { detectImageType } from './image.js';
import type { StorageProvider, StoredFile } from './storage.provider.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * multer for a single image field; its errors become our HttpError envelope.
 * The file stays in memory (≤ 5 MB) so its real type can be checked before saving.
 */
export function receiveImage(field: string): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
  }).single(field);

  return (req, res, next) => {
    upload(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        next(new HttpError(tooLarge ? 413 : 400, tooLarge ? 'Image must be at most 5 MB' : 'Invalid upload'));
        return;
      }
      if (!error && !req.file) {
        next(new HttpError(400, `Attach the image as the "${field}" field`));
        return;
      }
      next(error);
    });
  };
}

/** Validates by magic bytes, stores the new image and deletes the one it replaces. */
export async function replaceImage(
  storage: StorageProvider,
  data: Buffer,
  previousKey: string | null,
  save: (stored: StoredFile) => Promise<void>,
): Promise<StoredFile> {
  const type = detectImageType(data);
  if (!type) throw new HttpError(400, 'Only JPEG, PNG or WebP images are allowed');
  const stored = await storage.saveImage(data, type);
  await save(stored);
  if (previousKey) {
    await storage.remove(previousKey).catch((error: unknown) => {
      console.error(`[storage] could not delete replaced image ${previousKey}`, error);
    });
  }
  return stored;
}
