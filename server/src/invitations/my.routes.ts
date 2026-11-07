import {
  createInvitationSchema,
  invitationDraftSchema,
  invitationIdSchema,
  publishSchema,
  galleryOrderSchema,
  galleryPhotoParamsSchema,
  uploadDurationSchema,
} from '@chakyruu/shared';
import { Router } from 'express';
import { currentUser, requireAuth } from '../auth/auth.middleware.js';
import { guestRouter } from '../guests/guest.routes.js';
import { myTilekRouter } from '../tilek/tilek.routes.js';
import { sendOk } from '../lib/http.js';
import { receiveAudio, type AudioCompressor } from '../storage/audioUpload.js';
import { receiveImage } from '../storage/imageUpload.js';
import type { StorageProvider } from '../storage/storage.provider.js';
import { createDraft, getOwnerInvitation, listMyInvitations, setPhoto, updateDraft } from './my.service.js';
import { addGalleryPhoto, removeGalleryPhoto, reorderGallery } from './gallery.service.js';
import { removeCustomMusic, setCustomMusic } from './music.service.js';
import { publishInvitation, type PublishContext } from './publish.service.js';

export interface MyInvitationsRouterDeps {
  storage: StorageProvider;
  checkout: PublishContext;
  compressAudio: AudioCompressor;
}

export function createMyInvitationsRouter({ storage, checkout, compressAudio }: MyInvitationsRouterDeps): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (_req, res) => {
    sendOk(res, await listMyInvitations(currentUser(res)));
  });

  router.post('/', async (req, res) => {
    const { templateId, giftCode } = createInvitationSchema.parse(req.body);
    sendOk(res, await createDraft(currentUser(res), templateId, giftCode), 201);
  });

  router.get('/:id', async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    sendOk(res, await getOwnerInvitation(id, currentUser(res)));
  });

  router.patch('/:id', async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    const input = invitationDraftSchema.parse(req.body);
    sendOk(res, await updateDraft(id, currentUser(res), input, storage));
  });

  router.post('/:id/photo', receiveImage('photo'), async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    sendOk(res, await setPhoto(id, currentUser(res), req.file?.buffer ?? Buffer.alloc(0), storage));
  });

  router.post('/:id/gallery', receiveImage('photo'), async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    sendOk(res, await addGalleryPhoto(id, currentUser(res), req.file?.buffer ?? Buffer.alloc(0), storage), 201);
  });

  router.put('/:id/gallery/order', async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    sendOk(res, await reorderGallery(id, currentUser(res), galleryOrderSchema.parse(req.body).photoIds));
  });

  router.delete('/:id/gallery/:photoId', async (req, res) => {
    const { id, photoId } = galleryPhotoParamsSchema.parse(req.params);
    sendOk(res, await removeGalleryPhoto(id, currentUser(res), photoId, storage));
  });

  router.post('/:id/music', receiveAudio('music'), async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    const { durationSec } = uploadDurationSchema.parse(req.body ?? {});
    const data = req.file?.buffer ?? Buffer.alloc(0);
    sendOk(res, await setCustomMusic(id, currentUser(res), { data, durationSec, storage, compress: compressAudio }));
  });

  router.delete('/:id/music', async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    sendOk(res, await removeCustomMusic(id, currentUser(res), storage));
  });

  router.post('/:id/publish', async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    const { provider } = publishSchema.parse(req.body);
    sendOk(res, await publishInvitation(id, currentUser(res), provider, checkout));
  });

  router.use('/:id/guests', guestRouter);
  router.use('/:id/tilekter', myTilekRouter);

  return router;
}
