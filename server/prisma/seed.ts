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

const TEMPLATES: readonly TemplateSeed[] = [
  {
    id: 'tpl-wedding-classic',
    name: 'Үйлөнүү тою — Классика',
    type: TemplateType.WEDDING,
    config: { palette: { primary: '#7A1F2B', accent: '#C9A24B', background: '#FBF5EA' }, ornament: 'kochkor-muiuz' },
  },
  {
    id: 'tpl-beshik-soft',
    name: 'Бешик той — Назик',
    type: TemplateType.BESHIK,
    config: { palette: { primary: '#5C7A8A', accent: '#E3C68F', background: '#F7F3EC' }, ornament: 'tumar' },
  },
  {
    id: 'tpl-sunnot-heritage',
    name: 'Сүннөт той — Мурас',
    type: TemplateType.SUNNOT,
    config: { palette: { primary: '#1F4E5F', accent: '#C9A24B', background: '#F4EFE6' }, ornament: 'kochkor-muiuz' },
  },
  {
    id: 'tpl-maarake-gold',
    name: 'Маараке — Алтын',
    type: TemplateType.MAARAKE,
    config: { palette: { primary: '#3E2A1E', accent: '#D4AF37', background: '#FAF6EE' }, ornament: 'shyrdak' },
  },
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
    musicUrl: null,
    message:
      'Урматтуу туугандар жана досторубуз! Сиздерди биздин үйлөнүү тоюбузга чакырабыз. Кубанычыбызды бирге бөлүшүңүздөр!',
    language: 'KY' as const,
    status: 'PUBLISHED' as const,
  };

  await prisma.invitation.upsert({
    where: { slug: DEMO_SLUG },
    update: data,
    create: { slug: DEMO_SLUG, ...data },
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
