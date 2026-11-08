import { adminIdParamsSchema, adminTemplatePatchSchema, templateAssetQuerySchema } from '@chakyruu/shared';
import { Router } from 'express';
import { HttpError, sendOk } from '../lib/http.js';
import { receiveImage } from '../storage/imageUpload.js';
import type { StorageProvider } from '../storage/storage.provider.js';
import { listTemplatesForAdmin, removeTemplateAsset, updateTemplate, uploadTemplateAsset } from './template.admin.service.js';

export interface AdminTemplateDeps {
  storage: StorageProvider;
}

/** Mounted inside the admin router (already admin-only) at /api/admin/templates. */
export function createAdminTemplateRouter({ storage }: AdminTemplateDeps): Router {
  const router = Router();

  router.get('/', async (_req, res) => sendOk(res, await listTemplatesForAdmin()));

  router.patch('/:id', async (req, res) => {
    const { id } = adminIdParamsSchema.parse(req.params);
    sendOk(res, await updateTemplate(id, adminTemplatePatchSchema.parse(req.body)));
  });

  // receiveImage already rate-limits uploads per user.
  router.post('/:id/assets', receiveImage('image'), async (req, res) => {
    const { id } = adminIdParamsSchema.parse(req.params);
    const { file } = templateAssetQuerySchema.parse(req.query);
    if (!req.file) throw new HttpError(400, 'Attach an image in the "image" field');
    sendOk(res, await uploadTemplateAsset(storage, id, file, req.file.buffer));
  });

  router.delete('/:id/assets', async (req, res) => {
    const { id } = adminIdParamsSchema.parse(req.params);
    const { file } = templateAssetQuerySchema.parse(req.query);
    sendOk(res, await removeTemplateAsset(storage, id, file));
  });

  return router;
}
