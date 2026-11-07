import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { buildTestApp, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createInvitationFixture, createOrgFixture, createTemplateFixtures, resetDatabase } from '../../test/db.js';

let ctx: TestContext;

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  await createTemplateFixtures();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function tamada(name: string, opts: { city?: string; languages?: ('KY' | 'RU' | 'UZ')[]; price?: number; published?: boolean }) {
  const { orgId } = await createOrgFixture({
    type: 'TAMADA',
    name,
    adminPhone: `+9967770${String(Math.floor(Math.random() * 1e5)).padStart(5, '0')}`,
    city: opts.city ?? 'Ош',
    catalogStatus: opts.published === false ? 'HIDDEN' : 'PUBLISHED',
  });
  await prisma.tamadaProfile.update({
    where: { organizationId: orgId },
    data: { languages: opts.languages ?? ['KY'], priceFromSom: opts.price ?? 20000 },
  });
  return orgId;
}

const names = (body: { data: { displayName: string }[] }) => body.data.map((t) => t.displayName).sort();

describe('tamada catalogue', () => {
  it('lists only published tamadas and never exposes their WhatsApp', async () => {
    await tamada('Нурбек', {});
    await tamada('Жашыруун', { published: false });
    const res = await request(buildTestApp(ctx)).get('/api/public/tamadas').expect(200);
    expect(names(res.body)).toEqual(['Нурбек']);
    expect(JSON.stringify(res.body)).not.toContain('+996700999000');
  });

  it('filters by city, language and price', async () => {
    await tamada('Нурбек', { city: 'Ош', languages: ['KY', 'RU'], price: 20000 });
    await tamada('Азамат', { city: 'Бишкек', languages: ['KY'], price: 15000 });
    await tamada('Шерзод', { city: 'Ош', languages: ['UZ', 'RU'], price: 40000 });
    const app = buildTestApp(ctx);

    expect(names((await request(app).get('/api/public/tamadas?city=ош').expect(200)).body)).toEqual(['Нурбек', 'Шерзод']);
    expect(names((await request(app).get('/api/public/tamadas?lang=UZ').expect(200)).body)).toEqual(['Шерзод']);
    expect(names((await request(app).get('/api/public/tamadas?priceMax=20000').expect(200)).body)).toEqual(['Азамат', 'Нурбек']);
    await request(app).get('/api/public/tamadas?lang=EN').expect(400);
  });

  it('hides tamadas who are busy on the requested date', async () => {
    const manual = await tamada('Нурбек', {});
    const booked = await tamada('Азамат', {});
    await tamada('Бош', {});
    await prisma.tamadaBusyDate.create({ data: { organizationId: manual, date: new Date('2027-06-15T00:00:00Z') } });
    const invitationId = await createInvitationFixture({ slug: 'booked-toi', ownerPhone: '+996555000111', organizationId: null });
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { tamadaOrgId: booked, eventDate: new Date('2027-06-15T19:00:00+06:00') },
    });

    const res = await request(buildTestApp(ctx)).get('/api/public/tamadas?date=2027-06-15').expect(200);
    expect(names(res.body)).toEqual(['Бош']);
    const otherDay = await request(buildTestApp(ctx)).get('/api/public/tamadas?date=2027-06-16').expect(200);
    expect(names(otherDay.body)).toHaveLength(3);
  });
});

describe('branding on the invitation', () => {
  it('shows the venue and the tamada, without the tamada phone', async () => {
    const { orgId: venueId } = await createOrgFixture({ type: 'VENUE', name: 'Ала-Тоо', adminPhone: '+996700000010', catalogStatus: 'PUBLISHED' });
    const hall = await prisma.hall.create({ data: { organizationId: venueId, name: 'Чоң зал', capacity: 400 } });
    const tamadaId = await tamada('Нурбек', {});

    const client = await loginAgent(ctx, '+996555000111');
    const { id } = (await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(201)).body.data;
    await client
      .patch(`/api/my/invitations/${id}`)
      .send({ hostNames: 'Асан & Айгүл', venueOrgId: venueId, hallId: hall.id, tamadaOrgId: tamadaId })
      .expect(200);
    await prisma.invitation.update({ where: { id }, data: { status: 'PUBLISHED' } });

    const res = await request(buildTestApp(ctx)).get('/api/public/invitations/asan-aigul').expect(200);
    expect(res.body.data.venue).toMatchObject({ name: 'Ала-Тоо', address: 'Ош ш., Ленин көч. 1', hallName: 'Чоң зал' });
    expect(res.body.data.tamada).toMatchObject({ id: tamadaId, displayName: 'Нурбек' });
    expect(JSON.stringify(res.body)).not.toContain('+996700999000');
  });

  it('refuses to link hidden partners or a hall of another venue', async () => {
    const hidden = await tamada('Жашыруун', { published: false });
    const { orgId: venueA } = await createOrgFixture({ type: 'VENUE', name: 'A', adminPhone: '+996700000011', catalogStatus: 'PUBLISHED' });
    const { orgId: venueB } = await createOrgFixture({ type: 'VENUE', name: 'B', adminPhone: '+996700000012', catalogStatus: 'PUBLISHED' });
    const hallB = await prisma.hall.create({ data: { organizationId: venueB, name: 'B зал', capacity: 100 } });

    const client = await loginAgent(ctx, '+996555000111');
    const { id } = (await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(201)).body.data;
    await client.patch(`/api/my/invitations/${id}`).send({ tamadaOrgId: hidden }).expect(400);
    await client.patch(`/api/my/invitations/${id}`).send({ tamadaOrgId: venueA }).expect(400);
    await client.patch(`/api/my/invitations/${id}`).send({ venueOrgId: venueA, hallId: hallB.id }).expect(400);
  });
});

describe('"Тамадага жазуу"', () => {
  it('counts the click once per visitor and redirects to WhatsApp', async () => {
    const tamadaId = await tamada('Нурбек', {});
    const app = buildTestApp(ctx);
    const res = await request(app).get(`/api/public/tamadas/${tamadaId}/contact`).expect(302);
    expect(res.headers.location).toMatch(/^https:\/\/wa\.me\/996700999000\?text=/);
    await request(app).get(`/api/public/tamadas/${tamadaId}/contact`).expect(302);
    expect(await prisma.tamadaClick.count({ where: { organizationId: tamadaId } })).toBe(1);
  });

  it('is 404 for hidden tamadas that are not on that invitation', async () => {
    const hidden = await tamada('Жашыруун', { published: false });
    await request(buildTestApp(ctx)).get(`/api/public/tamadas/${hidden}/contact`).expect(404);
  });
});
