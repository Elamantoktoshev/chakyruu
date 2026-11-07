import type { PrismaClient } from '@prisma/client';

const PHONE_PATTERN = /^\+996\d{9}$/;

export const VENUE_ADMIN_PHONE = '+996700000010';
export const TAMADA_ADMIN_PHONE = '+996700000020';

/** Grants the starting balance once (on create) and records it in the ledger. */
async function ensureStartingCredits(prisma: PrismaClient, organizationId: string, credits: number): Promise<void> {
  const granted = await prisma.creditTransaction.count({ where: { organizationId, reason: 'ADMIN_GRANT' } });
  if (granted > 0) return;
  await prisma.$transaction([
    prisma.organization.update({ where: { id: organizationId }, data: { invitationCredits: { increment: credits } } }),
    prisma.creditTransaction.create({ data: { organizationId, amount: credits, reason: 'ADMIN_GRANT' } }),
  ]);
}

async function attachAdmin(prisma: PrismaClient, phone: string, organizationId: string): Promise<void> {
  await prisma.user.upsert({
    where: { phone },
    update: { role: 'ORG_ADMIN', organizationId },
    create: { phone, role: 'ORG_ADMIN', organizationId },
  });
}

async function seedVenue(prisma: PrismaClient): Promise<void> {
  const venue = await prisma.organization.upsert({
    where: { slug: 'ala-too-osh' },
    update: {},
    create: {
      slug: 'ala-too-osh',
      type: 'VENUE',
      name: '«Ала-Тоо» тойканасы',
      city: 'Ош',
      address: 'Ош ш., Масалиев көч. 45',
      mapUrl: 'https://2gis.kg/osh/search/' + encodeURIComponent('Ала-Тоо тойкана'),
      phone: VENUE_ADMIN_PHONE,
      whatsapp: VENUE_ADMIN_PHONE,
      instagram: 'alatoo_toikana',
      catalogStatus: 'PUBLISHED',
      halls: { create: [{ name: 'Чоң зал', capacity: 500 }, { name: 'Кичи зал', capacity: 150 }] },
    },
    select: { id: true },
  });
  await ensureStartingCredits(prisma, venue.id, 10);
  await attachAdmin(prisma, VENUE_ADMIN_PHONE, venue.id);
}

async function seedTamada(prisma: PrismaClient): Promise<void> {
  const tamada = await prisma.organization.upsert({
    where: { slug: 'nurbek-tamada' },
    update: {},
    create: {
      slug: 'nurbek-tamada',
      type: 'TAMADA',
      name: 'Нурбек',
      city: 'Ош',
      phone: TAMADA_ADMIN_PHONE,
      whatsapp: TAMADA_ADMIN_PHONE,
      instagram: 'nurbek.tamada',
      catalogStatus: 'PUBLISHED',
      tamadaProfile: {
        create: {
          displayName: 'Нурбек',
          bio: 'Үйлөнүү той, кыз узатуу, маараке. Кыргызча жана орусча алып барам.',
          languages: ['KY', 'RU'],
          priceFromSom: 25000,
          videoUrls: [],
        },
      },
    },
    select: { id: true },
  });
  await ensureStartingCredits(prisma, tamada.id, 5);
  await attachAdmin(prisma, TAMADA_ADMIN_PHONE, tamada.id);
}

/** Super-admin from ADMIN_PHONE (skipped when unset or malformed). */
async function seedAdmin(prisma: PrismaClient): Promise<string | null> {
  const phone = process.env.ADMIN_PHONE?.trim();
  if (!phone) return null;
  if (!PHONE_PATTERN.test(phone)) throw new Error(`ADMIN_PHONE must be +996XXXXXXXXX, got "${phone}"`);
  await prisma.user.upsert({
    where: { phone },
    update: { role: 'ADMIN', organizationId: null },
    create: { phone, role: 'ADMIN' },
  });
  return phone;
}

export async function seedPartners(prisma: PrismaClient): Promise<string> {
  await seedVenue(prisma);
  await seedTamada(prisma);
  const admin = await seedAdmin(prisma);
  return `venue admin ${VENUE_ADMIN_PHONE}, tamada admin ${TAMADA_ADMIN_PHONE}, ADMIN ${admin ?? '(ADMIN_PHONE not set)'}`;
}
