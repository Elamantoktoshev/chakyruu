import { EVENT_TYPES } from '@chakyruu/shared';
import { Router } from 'express';
import { z } from 'zod';
import { sendOk } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

const listQuerySchema = z.object({ type: z.enum(EVENT_TYPES).optional() });

export const templateRouter = Router();

templateRouter.get('/', async (req, res) => {
  const { type } = listQuerySchema.parse(req.query);
  const templates = await prisma.template.findMany({
    where: type ? { type } : undefined,
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, type: true, config: true },
  });
  sendOk(res, templates);
});
