import { prisma } from '../src/lib/prisma.js';

/** Wipes every table in the test schema. Never point this at a real database. */
export async function resetDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL?.includes('schema=test')) {
    throw new Error('Refusing to reset a non-test database');
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Price", "Session", "OtpCode", "PartnerLead", "TamadaClick", "GiftCode", "CreditTransaction", "TamadaBusyDate", "TamadaProfile", "Hall", "TilekLike", "Tilek", "Guest", "Payment", "PromoCode", "Invitation", "Template", "Track", "User", "Organization" CASCADE',
  );
  await prisma.price.createMany({ data: DEFAULT_PRICES });
}

/** Same defaults as the migrations leave (`admin`, then `publish_price_499`). */
export const DEFAULT_PRICES = [
  { code: 'INVITATION_PUBLISH', audience: 'CLIENT', amountSom: 499, credits: null, sortOrder: 0 },
  { code: 'VENUE_PACK_10', audience: 'VENUE', amountSom: 5000, credits: 10, sortOrder: 10 },
  { code: 'VENUE_PACK_30', audience: 'VENUE', amountSom: 13500, credits: 30, sortOrder: 11 },
  { code: 'VENUE_PACK_100', audience: 'VENUE', amountSom: 40000, credits: 100, sortOrder: 12 },
  { code: 'TAMADA_PACK_10', audience: 'TAMADA', amountSom: 4000, credits: 10, sortOrder: 20 },
  { code: 'TAMADA_PACK_30', audience: 'TAMADA', amountSom: 10500, credits: 30, sortOrder: 21 },
  { code: 'TAMADA_PACK_100', audience: 'TAMADA', amountSom: 30000, credits: 100, sortOrder: 22 },
] as const;

export async function createAdminUser(phone: string): Promise<void> {
  await prisma.user.upsert({ where: { phone }, update: { role: 'ADMIN' }, create: { phone, role: 'ADMIN' } });
}

export const TEST_TEMPLATE_ID = 'tpl-test';

/** Two templates of different types for builder tests. */
export async function createTemplateFixtures(): Promise<void> {
  await prisma.template.createMany({
    data: [
      { id: TEST_TEMPLATE_ID, name: 'Test wedding', type: 'WEDDING', componentKey: 'classic', sortOrder: 1 },
      { id: 'tpl-test-beshik', name: 'Test beshik', type: 'BESHIK', componentKey: 'bala', sortOrder: 2 },
      { id: 'tpl-test-shyrdak', name: 'Test shyrdak', type: 'WEDDING', componentKey: 'shyrdak', isUniversal: true, sortOrder: 3 },
    ],
    skipDuplicates: true,
  });
}

export interface InvitationFixture {
  slug: string;
  ownerPhone: string;
  organizationId: string | null;
}

/** Token of the attending guest created by createInvitationFixture. */
export const fixtureGuestToken = (slug: string): string => `fixture_${slug.replace(/-/g, '_')}_guest01`;

/** Creates a template + owner + published invitation with one attending guest (2 people). */
export async function createInvitationFixture(fixture: InvitationFixture): Promise<string> {
  const template = await prisma.template.upsert({
    where: { id: 'tpl-test' },
    update: {},
    create: { id: 'tpl-test', name: 'Test', type: 'WEDDING' },
  });
  const owner = await prisma.user.upsert({
    where: { phone: fixture.ownerPhone },
    update: {},
    create: { phone: fixture.ownerPhone, organizationId: fixture.organizationId },
  });
  const invitation = await prisma.invitation.create({
    select: { id: true },
    data: {
      slug: fixture.slug,
      templateId: template.id,
      ownerId: owner.id,
      organizationId: fixture.organizationId,
      hostNames: 'Test & Test',
      eventDate: new Date('2027-06-15T17:00:00+06:00'),
      venueName: 'Test hall',
      status: 'PUBLISHED',
      guests: {
        create: { name: 'Нурлан', token: fixtureGuestToken(fixture.slug), status: 'ATTENDING', guestsCount: 2 },
      },
    },
  });
  return invitation.id;
}

export interface OrgFixture {
  type: 'VENUE' | 'TAMADA' | 'AGENCY';
  name: string;
  adminPhone: string;
  credits?: number;
  city?: string;
  catalogStatus?: 'HIDDEN' | 'PUBLISHED';
  whatsapp?: string | null;
}

/** Organization + its ORG_ADMIN user. Tamadas also get a profile. */
export async function createOrgFixture(fixture: OrgFixture): Promise<{ orgId: string; adminId: string }> {
  const org = await prisma.organization.create({
    data: {
      type: fixture.type,
      name: fixture.name,
      slug: `${fixture.type.toLowerCase()}-${Math.random().toString(36).slice(2, 10)}`,
      city: fixture.city ?? 'Ош',
      invitationCredits: fixture.credits ?? 0,
      catalogStatus: fixture.catalogStatus ?? 'HIDDEN',
      whatsapp: fixture.whatsapp === undefined ? '+996700999000' : fixture.whatsapp,
      address: fixture.type === 'VENUE' ? 'Ош ш., Ленин көч. 1' : null,
      mapUrl: fixture.type === 'VENUE' ? 'https://2gis.kg/osh/firm/1' : null,
      ...(fixture.type === 'TAMADA'
        ? { tamadaProfile: { create: { displayName: fixture.name, languages: ['KY', 'RU'], priceFromSom: 20000 } } }
        : {}),
    },
    select: { id: true },
  });
  const admin = await prisma.user.upsert({
    where: { phone: fixture.adminPhone },
    update: { role: 'ORG_ADMIN', organizationId: org.id },
    create: { phone: fixture.adminPhone, role: 'ORG_ADMIN', organizationId: org.id },
    select: { id: true },
  });
  return { orgId: org.id, adminId: admin.id };
}
