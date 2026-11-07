import { EVENT_TYPES } from '@chakyruu/shared';
import { Router } from 'express';
import { z } from 'zod';
import { sendOk } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

const listQuerySchema = z.object({ type: z.enum(EVENT_TYPES).optional() });

export const templateSelect = { id: true, name: true, type: true, componentKey: true, isUniversal: true, config: true } as const;

export const templateRouter = Router();

templateRouter.get('/', async (req, res) => {
  const { type } = listQuerySchema.parse(req.query);
  const templates = await prisma.template.findMany({
    // Universal templates (Shyrdak) fit every kind of toi.
    where: type ? { OR: [{ type }, { isUniversal: true }] } : undefined,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: templateSelect,
  });
  sendOk(res, templates);
});
