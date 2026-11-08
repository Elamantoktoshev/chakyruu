import { EVENT_TYPES } from '@chakyruu/shared';
import { Router } from 'express';
import { z } from 'zod';
import { sendOk } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { findTemplatePublishPriceSom } from '../pricing/price.service.js';

const listQuerySchema = z.object({ type: z.enum(EVENT_TYPES).optional() });

export const templateSelect = {
  id: true,
  name: true,
  type: true,
  componentKey: true,
  isUniversal: true,
  config: true,
  priceSom: true,
  badge: true,
  description: true,
} as const;

/** Storage keys of admin uploads are internal: browsers only need the URLs. */
export function publicTemplate<T extends { config: unknown }>(template: T): T {
  const { config } = template;
  if (typeof config !== 'object' || config === null || !('uploadKeys' in config)) return template;
  const { uploadKeys: _uploadKeys, ...rest } = config as Record<string, unknown>;
  return { ...template, config: rest };
}

export const templateRouter = Router();

templateRouter.get('/', async (req, res) => {
  const { type } = listQuerySchema.parse(req.query);
  const templates = await prisma.template.findMany({
    // Universal templates (Shyrdak) fit every kind of toi.
    where: { isActive: true, ...(type ? { OR: [{ type }, { isUniversal: true }] } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: templateSelect,
  });
  // The card shows the final price: the design's own one, or the shop-wide publish price.
  const shopPriceSom = await findTemplatePublishPriceSom(null);
  sendOk(
    res,
    templates.map((template) => publicTemplate({ ...template, priceSom: template.priceSom ?? shopPriceSom })),
  );
});
