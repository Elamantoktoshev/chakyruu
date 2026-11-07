import type { hallSchema, orgProfileSchema, tamadaProfileSchema } from '@chakyruu/shared';
import type { z } from 'zod';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { replaceImage } from '../storage/imageUpload.js';
import { AVATAR_MAX_SIZE } from '../storage/imageProcess.js';
import type { StorageProvider } from '../storage/storage.provider.js';

type OrgProfile = z.output<typeof orgProfileSchema>;
type TamadaProfile = z.output<typeof tamadaProfileSchema>;
type HallInput = z.output<typeof hallSchema>;

const LEDGER_PAGE = 100;

const profileSelect = {
  id: true,
  type: true,
  name: true,
  phone: true,
  whatsapp: true,
  instagram: true,
  city: true,
  logoUrl: true,
  address: true,
  mapUrl: true,
  invitationCredits: true,
  catalogStatus: true,
  halls: { orderBy: { createdAt: 'asc' }, select: { id: true, name: true, capacity: true } },
  tamadaProfile: {
    select: { displayName: true, photoUrl: true, bio: true, languages: true, priceFromSom: true, videoUrls: true },
  },
  busyDates: { where: { date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, orderBy: { date: 'asc' }, select: { date: true } },
} as const;

async function loadOrgType(orgId: string) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { type: true } });
  return org.type;
}

async function assertType(orgId: string, expected: 'VENUE' | 'TAMADA'): Promise<void> {
  if ((await loadOrgType(orgId)) !== expected) {
    throw new HttpError(400, expected === 'VENUE' ? 'Only venues have halls' : 'Only tamadas have this profile');
  }
}

export async function getPartnerProfile(orgId: string) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: profileSelect });
  return { ...org, busyDates: org.busyDates.map(({ date }) => date.toISOString().slice(0, 10)) };
}

export async function updatePartnerProfile(orgId: string, input: OrgProfile) {
  const type = await loadOrgType(orgId);
  const touchesVenueFields = input.address !== undefined || input.mapUrl !== undefined;
  if (touchesVenueFields && type !== 'VENUE') throw new HttpError(400, 'Address and 2GIS link are for venues');
  await prisma.organization.update({ where: { id: orgId }, data: input });
  return getPartnerProfile(orgId);
}

export async function setPartnerLogo(orgId: string, data: Buffer, storage: StorageProvider) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { logoKey: true } });
  const stored = await replaceImage(storage, data, org.logoKey, async ({ url, key }) => {
    await prisma.organization.update({ where: { id: orgId }, data: { logoUrl: url, logoKey: key } });
  }, AVATAR_MAX_SIZE);
  return { logoUrl: stored.url };
}

export async function addHall(orgId: string, input: HallInput) {
  await assertType(orgId, 'VENUE');
  return prisma.hall.create({ data: { ...input, organizationId: orgId }, select: { id: true, name: true, capacity: true } });
}

export async function updateHall(orgId: string, hallId: string, input: HallInput) {
  const { count } = await prisma.hall.updateMany({ where: { id: hallId, organizationId: orgId }, data: input });
  if (count === 0) throw new HttpError(404, 'Hall not found');
  return prisma.hall.findUniqueOrThrow({ where: { id: hallId }, select: { id: true, name: true, capacity: true } });
}

export async function deleteHall(orgId: string, hallId: string): Promise<void> {
  const { count } = await prisma.hall.deleteMany({ where: { id: hallId, organizationId: orgId } });
  if (count === 0) throw new HttpError(404, 'Hall not found');
}

export async function updateTamadaProfile(orgId: string, input: TamadaProfile) {
  await assertType(orgId, 'TAMADA');
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { name: true } });
  await prisma.tamadaProfile.upsert({
    where: { organizationId: orgId },
    update: input,
    create: { displayName: org.name, languages: [], videoUrls: [], ...input, organizationId: orgId },
  });
  return getPartnerProfile(orgId);
}

export async function setTamadaPhoto(orgId: string, data: Buffer, storage: StorageProvider) {
  await assertType(orgId, 'TAMADA');
  const profile = await prisma.tamadaProfile.findUnique({ where: { organizationId: orgId }, select: { photoKey: true } });
  if (!profile) throw new HttpError(400, 'Fill in the tamada profile first');
  const stored = await replaceImage(storage, data, profile.photoKey, async ({ url, key }) => {
    await prisma.tamadaProfile.update({ where: { organizationId: orgId }, data: { photoUrl: url, photoKey: key } });
  }, AVATAR_MAX_SIZE);
  return { photoUrl: stored.url };
}

const toDay = (day: string): Date => new Date(`${day}T00:00:00Z`);

export async function setBusyDate(orgId: string, day: string, isBusy: boolean): Promise<void> {
  await assertType(orgId, 'TAMADA');
  const date = toDay(day);
  if (isBusy) {
    await prisma.tamadaBusyDate.upsert({
      where: { organizationId_date: { organizationId: orgId, date } },
      update: {},
      create: { organizationId: orgId, date },
    });
    return;
  }
  await prisma.tamadaBusyDate.deleteMany({ where: { organizationId: orgId, date } });
}

export async function getCredits(orgId: string) {
  const [org, ledger] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { invitationCredits: true } }),
    prisma.creditTransaction.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: LEDGER_PAGE,
      select: { id: true, amount: true, reason: true, createdAt: true },
    }),
  ]);
  return { balance: org.invitationCredits, ledger };
}
