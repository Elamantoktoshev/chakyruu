import { bulkGuestsSchema, guestListQuerySchema, guestParamsSchema, invitationIdSchema } from '@chakyruu/shared';
import { Router } from 'express';
import { currentUser } from '../auth/auth.middleware.js';
import { sendOk } from '../lib/http.js';
import { addGuests, deleteGuest, listGuests } from './guest.service.js';

/** Mounted at /api/my/invitations/:id/guests (behind requireAuth). */
export const guestRouter = Router({ mergeParams: true });

guestRouter.get('/', async (req, res) => {
  const { id } = invitationIdSchema.parse(req.params);
  const { status } = guestListQuerySchema.parse(req.query);
  sendOk(res, await listGuests(id, currentUser(res), status));
});

guestRouter.post('/bulk', async (req, res) => {
  const { id } = invitationIdSchema.parse(req.params);
  const { text } = bulkGuestsSchema.parse(req.body);
  sendOk(res, await addGuests(id, currentUser(res), text), 201);
});

guestRouter.delete('/:guestId', async (req, res) => {
  const { id, guestId } = guestParamsSchema.parse(req.params);
  await deleteGuest(id, guestId, currentUser(res));
  sendOk(res, { deleted: true });
});
