import type { Request, RequestHandler, Response } from 'express';
import multer from 'multer';
import { HttpError } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';

interface ReceiveFileOptions {
  field: string;
  maxBytes: number;
  /** Text fields allowed next to the file (e.g. the measured duration). */
  maxFields?: number;
}

const BYTES_PER_MB = 1024 * 1024;
/** Uploads cost CPU (sharp, ffmpeg): a person adding photos stays far below this. */
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const UPLOADS_PER_WINDOW = 40;

/** Uploads always follow requireAuth: the bucket is the user (people behind one NAT share an IP). */
const byUser = (req: Request, res: Response): string => {
  const user = res.locals.user as { id?: string } | undefined;
  return user?.id ? `user:${user.id}` : `ip:${req.ip ?? 'unknown'}`;
};

/**
 * multer for one file field kept in memory, so its real type can be checked before saving.
 * Its errors become our HttpError envelope.
 */
export function receiveFile({ field, maxBytes, maxFields = 0 }: ReceiveFileOptions): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: maxFields },
  }).single(field);

  const limit = rateLimit({ windowMs: UPLOAD_WINDOW_MS, max: UPLOADS_PER_WINDOW, key: byUser });

  return (req, res, next) => {
    // Counted before the body is read, so a flood never reaches multer, sharp or ffmpeg.
    limit(req, res, (limited?: unknown) => {
      if (limited) {
        next(limited);
        return;
      }
      receive(req, res, next);
    });
  };

  function receive(req: Request, res: Response, next: (error?: unknown) => void): void {
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
  }
}
