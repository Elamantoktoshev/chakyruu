import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ILLUSTRATED_TEMPLATES, manifestOfSeed, seedIllustratedTemplates } from '../../prisma/seed.illustrated.js';
import { prisma } from '../lib/prisma.js';
import { resetDatabase } from '../../test/db.js';

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('illustrated template seed', () => {
  it('has 12 valid manifests with unique slugs and ids', () => {
    expect(ILLUSTRATED_TEMPLATES).toHaveLength(12);
    const manifests = ILLUSTRATED_TEMPLATES.map(manifestOfSeed);
    expect(new Set(manifests.map((manifest) => manifest.slug)).size).toBe(12);
    expect(new Set(ILLUSTRATED_TEMPLATES.map((seed) => seed.id)).size).toBe(12);
    for (const seed of ILLUSTRATED_TEMPLATES) {
      expect(seed.description.ky.length, seed.id).toBeGreaterThan(10);
      expect(seed.description.ru.length, seed.id).toBeGreaterThan(10);
    }
  });

  it('creates the designs once and never undoes admin edits or uploads on the next deploy', async () => {
    await seedIllustratedTemplates(prisma);
    const [first] = ILLUSTRATED_TEMPLATES;
    const id = first!.id;
    expect(await prisma.template.findUniqueOrThrow({ where: { id } })).toMatchObject({ componentKey: 'illustrated', badge: 'NEW', priceSom: null, isActive: true });

    const created = await prisma.template.findUniqueOrThrow({ where: { id } });
    const uploaded = { ...(created.config as object), uploads: { 'cover.webp': '/uploads/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed.webp' } };
    await prisma.template.update({ where: { id }, data: { name: 'Admin name', priceSom: 990, badge: 'HIT', isActive: false, sortOrder: 1, config: uploaded } });

    await seedIllustratedTemplates(prisma);
    const after = await prisma.template.findUniqueOrThrow({ where: { id } });
    expect(after).toMatchObject({ name: 'Admin name', priceSom: 990, badge: 'HIT', isActive: false, sortOrder: 1 });
    expect((after.config as { uploads: Record<string, string> }).uploads['cover.webp']).toBe('/uploads/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed.webp');
    expect(await prisma.template.count({ where: { componentKey: 'illustrated' } })).toBe(12);
  });
});
