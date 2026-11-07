import { MAX_TRACK_BYTES, adminIdParamsSchema, trackCreateSchema, trackPatchSchema, uploadDurationSchema } from '@chakyruu/shared';
import { Router } from 'express';
import { sendOk } from '../lib/http.js';
import { receiveAudio, type AudioCompressor } from '../storage/audioUpload.js';
import type { StorageProvider } from '../storage/storage.provider.js';
import { createTrack, listActiveTracks, listAllTracks, setTrackFile, updateTrack } from './track.service.js';

/** GET /api/public/tracks — the builder's music catalogue. */
export function createPublicTrackRouter(): Router {
  const router = Router();
  router.get('/', async (_req, res) => sendOk(res, await listActiveTracks()));
  return router;
}

export interface AdminTrackDeps {
  storage: StorageProvider;
  compress: AudioCompressor;
}

/** Mounted inside the admin router (already admin-only). */
export function createAdminTrackRouter({ storage, compress }: AdminTrackDeps): Router {
  const router = Router();
  router.get('/', async (_req, res) => sendOk(res, await listAllTracks()));
  router.post('/', async (req, res) => sendOk(res, await createTrack(trackCreateSchema.parse(req.body)), 201));
  router.patch('/:id', async (req, res) => {
    const { id } = adminIdParamsSchema.parse(req.params);
    sendOk(res, await updateTrack(id, trackPatchSchema.parse(req.body)));
  });
  router.post('/:id/file', receiveAudio('file', MAX_TRACK_BYTES), async (req, res) => {
    const { id } = adminIdParamsSchema.parse(req.params);
    const { durationSec } = uploadDurationSchema.parse(req.body ?? {});
    sendOk(res, await setTrackFile(id, { data: req.file?.buffer ?? Buffer.alloc(0), durationSec, storage, compress }));
  });
  return router;
}
