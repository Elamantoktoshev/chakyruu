import { randomBytes } from 'node:crypto';
import { PrismaClient, TemplateType, type Prisma } from '@prisma/client';
import { seedPartners } from './seed.partners.js';

const prisma = new PrismaClient();

const DEMO_SLUG = 'aibek-aizada';
const DEMO_OWNER_PHONE = '+996700000001';

interface TemplateSeed {
  id: string;
  name: string;
  type: TemplateType;
  componentKey: string;
  isUniversal?: boolean;
  sortOrder: number;
}

/** The 8 component templates (client/src/templates). Kept in sync with the templates_v2 migration. */
const TEMPLATES: readonly TemplateSeed[] = [
  { id: 'tpl-classic', name: 'Классика', type: TemplateType.WEDDING, componentKey: 'classic', sortOrder: 10 },
  { id: 'tpl-minimal', name: 'Минимализм', type: TemplateType.WEDDING, componentKey: 'minimal', sortOrder: 11 },
  { id: 'tpl-alatoo', name: 'Ала-Тоо', type: TemplateType.WEDDING, componentKey: 'alatoo', sortOrder: 12 },
  { id: 'tpl-nazik', name: 'Назик', type: TemplateType.KYZ_UZATUU, componentKey: 'nazik', sortOrder: 20 },
  { id: 'tpl-bala', name: 'Бала', type: TemplateType.BESHIK, componentKey: 'bala', sortOrder: 30 },
  { id: 'tpl-batyr', name: 'Баатыр', type: TemplateType.SUNNOT, componentKey: 'batyr', sortOrder: 40 },
  { id: 'tpl-yubiley', name: 'Юбилей', type: TemplateType.MAARAKE, componentKey: 'yubiley', sortOrder: 50 },
  { id: 'tpl-shyrdak', name: 'Шырдак', type: TemplateType.WEDDING, componentKey: 'shyrdak', isUniversal: true, sortOrder: 60 },
];

async function seedTemplates(): Promise<void> {
  for (const { id, ...template } of TEMPLATES) {
    const data = { ...template, isUniversal: template.isUniversal ?? false, config: {} as Prisma.InputJsonObject };
    await prisma.template.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
}

async function seedDemoInvitation(): Promise<void> {
  const owner = await prisma.user.upsert({
    where: { phone: DEMO_OWNER_PHONE },
    update: {},
    create: { phone: DEMO_OWNER_PHONE, name: 'Айбек', role: 'OWNER' },
  });

  const data = {
    templateId: 'tpl-classic',
    paletteId: 'bordo-gold',
    openingAnimation: 'BOZ_UY' as const,
    program: [
      { time: '17:00', title: 'Конокторду тосуп алуу' },
      { time: '18:00', title: 'Нике кыюу, бата' },
      { time: '19:00', title: 'Той дасторконү' },
      { time: '21:00', title: 'Бий жана концерт' },
    ],
    ownerId: owner.id,
    hostNames: 'Айбек & Айзада',
    // 15.06.2027 17:00 Asia/Bishkek (UTC+6)
    eventDate: new Date('2027-06-15T17:00:00+06:00'),
    venueName: '«Ала-Тоо» тойканасы',
    venueAddress: 'Ош шаары',
    venueMapUrl: 'https://2gis.kg/osh/search/' + encodeURIComponent('Ала-Тоо тойкана'),
    // Unsplash (free licence), stored locally as webp so the demo loads like real invitations.
    photoUrl: '/demo/aibek-aizada.webp',
    musicTrackId: 'komuz-joy',
    eventType: TemplateType.WEDDING,
    publishedAt: new Date('2026-11-01T12:00:00+06:00'),
    message:
      'Урматтуу туугандар жана досторубуз! Сиздерди биздин үйлөнүү тоюбузга чакырабыз. Кубанычыбызды бирге бөлүшүңүздөр!',
    language: 'KY' as const,
    status: 'PUBLISHED' as const,
  };

  const invitation = await prisma.invitation.upsert({
    where: { slug: DEMO_SLUG },
    update: data,
    create: { slug: DEMO_SLUG, ...data },
    select: { id: true },
  });
  await seedDemoGuests(invitation.id);
}

const DEMO_GUESTS: readonly Omit<Prisma.GuestCreateManyInput, 'invitationId' | 'token'>[] = [
  { name: 'Асан байке', phone: '+996700123456', status: 'ATTENDING', guestsCount: 3, respondedAt: new Date() },
  { name: 'Айгүл эже', status: 'DECLINED', guestsCount: 0, respondedAt: new Date() },
  { name: 'Нурлан Асанов', status: 'INVITED' },
  { name: 'Бакыт', status: 'ATTENDING', guestsCount: 2, source: 'SELF', respondedAt: new Date() },
];

/** Re-created on every seed run so the demo always starts from the same state. */
async function seedDemoGuests(invitationId: string): Promise<void> {
  await prisma.guest.deleteMany({ where: { invitationId } });
  await prisma.guest.createMany({
    data: DEMO_GUESTS.map((guest) => ({ ...guest, invitationId, token: randomBytes(16).toString('base64url') })),
  });
}

async function main(): Promise<void> {
  await seedTemplates();
  await seedDemoInvitation();
  const partners = await seedPartners(prisma);
  console.info(`Seed done: ${TEMPLATES.length} templates, demo invitation "/${DEMO_SLUG}", ${partners}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
