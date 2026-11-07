import type { RequestHandler } from 'express';
import multer from 'multer';
import { HttpError } from '../lib/http.js';

interface ReceiveFileOptions {
  field: string;
  maxBytes: number;
  /** Text fields allowed next to the file (e.g. the measured duration). */
  maxFields?: number;
}

const BYTES_PER_MB = 1024 * 1024;

/**
 * multer for one file field kept in memory, so its real type can be checked before saving.
 * Its errors become our HttpError envelope.
 */
export function receiveFile({ field, maxBytes, maxFields = 0 }: ReceiveFileOptions): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: maxFields },
  }).single(field);

  return (req, res, next) => {
    upload(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        const message = tooLarge ? `File must be at most ${Math.round(maxBytes / BYTES_PER_MB)} MB` : 'Invalid upload';
        next(new HttpError(tooLarge ? 413 : 400, message));
        return;
      }
      if (!error && !req.file) {
        next(new HttpError(400, `Attach the file as the "${field}" field`));
        return;
      }
      next(error);
    });
  };
}
