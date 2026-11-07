import { normalizeCity, whatsappUrl, type CatalogQuery } from '@chakyruu/shared';
import type { Prisma } from '@prisma/client';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CATALOG_LIMIT = 100;
const CONTACT_MESSAGE = 'Саламатсызбы! Chakyruu.kg аркылуу жазып жатам. / Здравствуйте! Пишу через Chakyruu.kg.';

/** Bounds of a calendar day in Bishkek (UTC+6) for comparing invitation timestamps. */
function bishkekDay(day: string): { gte: Date; lt: Date } {
  const start = new Date(`${day}T00:00:00+06:00`);
  return { gte: start, lt: new Date(start.getTime() + DAY_MS) };
}

function tamadaWhere({ city, lang, priceMax, date }: CatalogQuery): Prisma.OrganizationWhereInput {
  const profile: Prisma.TamadaProfileWhereInput = {
    ...(lang ? { languages: { has: lang } } : {}),
    ...(priceMax !== undefined ? { priceFromSom: { lte: priceMax } } : {}),
  };
  return {
    type: 'TAMADA',
    catalogStatus: 'PUBLISHED',
    tamadaProfile: { is: profile },
    ...(city ? { city } : {}),
    // Free on that day: not marked busy by hand and not on another published invitation.
    ...(date
      ? {
          busyDates: { none: { date: new Date(`${date}T00:00:00Z`) } },
          tamadaInvitations: { none: { status: 'PUBLISHED', eventDate: bishkekDay(date) } },
        }
      : {}),
  };
}

/** Public tamada cards. WhatsApp is deliberately not included — contact goes through /contact. */
export async function listTamadas(query: CatalogQuery) {
  const tamadas = await prisma.organization.findMany({
    where: tamadaWhere(query),
    orderBy: { updatedAt: 'desc' },
    take: CATALOG_LIMIT,
    select: {
      id: true,
      city: true,
      instagram: true,
      tamadaProfile: {
        select: { displayName: true, photoUrl: true, bio: true, languages: true, priceFromSom: true, videoUrls: true },
      },
    },
  });
  return tamadas.flatMap(({ tamadaProfile, ...org }) => (tamadaProfile ? [{ ...org, ...tamadaProfile }] : []));
}

/** Published venues for the builder picker. */
export async function listVenues(city: string | undefined) {
  return prisma.organization.findMany({
    where: { type: 'VENUE', catalogStatus: 'PUBLISHED', ...(city ? { city: normalizeCity(city) } : {}) },
    orderBy: { name: 'asc' },
    take: CATALOG_LIMIT,
    select: { id: true, name: true, city: true, address: true, logoUrl: true, halls: { select: { id: true, name: true, capacity: true } } },
  });
}

/**
 * WhatsApp link for "Тамадага жазуу". Allowed for catalogue tamadas, and for a hidden tamada
 * only from an invitation that shows them (a gift from that tamada).
 */
export async function tamadaContact(orgId: string, invitationSlug: string | undefined) {
  const invitation = invitationSlug
    ? await prisma.invitation.findFirst({
        where: { slug: invitationSlug, status: 'PUBLISHED', tamadaOrgId: orgId },
        select: { id: true },
      })
    : null;
  const tamada = await prisma.organization.findFirst({
    where: { id: orgId, type: 'TAMADA', whatsapp: { not: null }, ...(invitation ? {} : { catalogStatus: 'PUBLISHED' }) },
    select: { whatsapp: true },
  });
  if (!tamada?.whatsapp) throw new HttpError(404, 'Tamada not found');
  return { url: whatsappUrl(tamada.whatsapp, CONTACT_MESSAGE), invitationId: invitation?.id ?? null };
}

export async function recordTamadaClick(orgId: string, invitationId: string | null): Promise<void> {
  await prisma.tamadaClick.create({ data: { organizationId: orgId, invitationId } });
}
