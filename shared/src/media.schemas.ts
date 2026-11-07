import { z } from 'zod';
import { GALLERY_MAX_PHOTOS } from './media.js';

const photoIdSchema = z.string().min(1).max(40);

export const galleryPhotoParamsSchema = z.object({ id: z.string().min(1).max(40), photoId: photoIdSchema });

/** New gallery order: every photo id once. */
export const galleryOrderSchema = z
  .object({ photoIds: z.array(photoIdSchema).max(GALLERY_MAX_PHOTOS) })
  .strict()
  .refine(({ photoIds }) => new Set(photoIds).size === photoIds.length, 'Duplicate photo ids');
