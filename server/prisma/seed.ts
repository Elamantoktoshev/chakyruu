import { randomBytes } from 'node:crypto';
import { PrismaClient, TemplateType, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_SLUG = 'aibek-aizada';
const DEMO_OWNER_PHONE = '+996700000001';

interface TemplateSeed {
  id: string;
  name: string;
  type: TemplateType;
  config: Prisma.InputJsonObject;
}

/** [primary, accent, background] — primary must stay dark enough for white text. */
type Palette = readonly [string, string, string];

function template(id: string, name: string, type: TemplateType, [primary, accent, background]: Palette, ornament: string): TemplateSeed {
  return { id, name, type, config: { palette: { primary, accent, background }, ornament } };
}

const TEMPLATES: readonly TemplateSeed[] = [
  template('tpl-wedding-classic', 'Үйлөнүү той — Классика', TemplateType.WEDDING, ['#7A1F2B', '#C9A24B', '#FBF5EA'], 'kochkor-muiuz'),
  template('tpl-wedding-silk', 'Үйлөнүү той — Жибек', TemplateType.WEDDING, ['#8C2F4B', '#D9A5B3', '#FDF4F6'], 'tumar'),
  template('tpl-kyz-shyrdak', 'Кыз узатуу — Шырдак', TemplateType.KYZ_UZATUU, ['#9B1C1C', '#E0B04B', '#FCF3E8'], 'shyrdak'),
  template('tpl-kyz-tender', 'Кыз узатуу — Назик', TemplateType.KYZ_UZATUU, ['#7B3F61', '#E6C3A5', '#FBF6F2'], 'tumar'),
  template('tpl-beshik-soft', 'Бешик той — Назик', TemplateType.BESHIK, ['#3F6577', '#E3C68F', '#F5F2EC'], 'tumar'),
  template('tpl-beshik-sun', 'Бешик той — Күн', TemplateType.BESHIK, ['#8A5A12', '#F2C14E', '#FFF9EC'], 'kochkor-muiuz'),
  template('tpl-sunnot-heritage', 'Сүннөт той — Мурас', TemplateType.SUNNOT, ['#1F4E5F', '#C9A24B', '#F4EFE6'], 'kochkor-muiuz'),
  template('tpl-sunnot-mountain', 'Сүннөт той — Тоо', TemplateType.SUNNOT, ['#2F5D3A', '#D4B26A', '#F3F4EC'], 'shyrdak'),
  template('tpl-maarake-gold', 'Маараке — Алтын', TemplateType.MAARAKE, ['#3E2A1E', '#D4AF37', '#FAF6EE'], 'shyrdak'),
  template('tpl-maarake-night', 'Маараке — Түн', TemplateType.MAARAKE, ['#1E2A4A', '#C9A24B', '#F3F1EA'], 'kochkor-muiuz'),
];

async function seedTemplates(): Promise<void> {
  for (const template of TEMPLATES) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: { name: template.name, type: template.type, config: template.config },
      create: { ...template },
    });
  }
}

async function seedDemoInvitation(): Promise<void> {
  const owner = await prisma.user.upsert({
    where: { phone: DEMO_OWNER_PHONE },
    update: {},
    create: { phone: DEMO_OWNER_PHONE, name: 'Айбек', role: 'OWNER' },
  });

  const data = {
    templateId: 'tpl-wedding-classic',
    ownerId: owner.id,
    hostNames: 'Айбек & Айзада',
    // 15.06.2027 17:00 Asia/Bishkek (UTC+6)
    eventDate: new Date('2027-06-15T17:00:00+06:00'),
    venueName: '«Ала-Тоо» тойканасы',
    venueAddress: 'Ош шаары',
    venueMapUrl: 'https://2gis.kg/osh/search/' + encodeURIComponent('Ала-Тоо тойкана'),
    photoUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
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
  console.info(`Seed done: ${TEMPLATES.length} templates, demo invitation "/${DEMO_SLUG}"`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
