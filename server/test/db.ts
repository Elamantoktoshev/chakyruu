import { prisma } from '../src/lib/prisma.js';

/** Wipes every table in the test schema. Never point this at a real database. */
export async function resetDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL?.includes('schema=test')) {
    throw new Error('Refusing to reset a non-test database');
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Session", "OtpCode", "PartnerLead", "TilekLike", "Tilek", "Guest", "Payment", "Invitation", "Template", "User", "Organization" CASCADE',
  );
}

export const TEST_TEMPLATE_ID = 'tpl-test';

/** Two templates of different types for builder tests. */
export async function createTemplateFixtures(): Promise<void> {
  await prisma.template.createMany({
    data: [
      { id: TEST_TEMPLATE_ID, name: 'Test wedding', type: 'WEDDING', config: { palette: { primary: '#7A1F2B' } } },
      { id: 'tpl-test-beshik', name: 'Test beshik', type: 'BESHIK' },
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
