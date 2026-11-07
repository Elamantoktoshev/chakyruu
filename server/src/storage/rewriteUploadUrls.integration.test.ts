import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createInvitationFixture, resetDatabase } from '../../test/db.js';
import { rewriteUploadUrls } from './rewriteUploadUrls.js';

const CDN = 'https://chakyruu.fra1.cdn.digitaloceanspaces.com';
const KEY = '0b6f2c1e-5d1a-4c9e-9a51-1f3c2d4e5f60';

let invitationId: string;

beforeEach(async () => {
  await resetDatabase();
  invitationId = await createInvitationFixture({ slug: 'aibek-aizada', ownerPhone: '+996700000001', organizationId: null });
  await prisma.invitation.update({
    where: { id: invitationId },
    data: { photoUrl: `/uploads/${KEY}.webp`, customMusicUrl: `/uploads/${KEY}.mp3` },
  });
  await prisma.invitationPhoto.create({ data: { invitationId, url: `/uploads/${KEY}.png`, key: `${KEY}.png`, width: 1, height: 1 } });
  await prisma.track.create({ data: { id: 'bundled', title: 'Комуз', category: 'ULUTTUK', file: '/music/komuz.mp3' } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('rewriteUploadUrls', () => {
  it('only counts on a dry run', async () => {
    const counts = await rewriteUploadUrls(prisma, CDN, true);
    expect(counts.find((c) => c.column === 'Invitation.photoUrl')?.count).toBe(1);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } })).photoUrl).toBe(`/uploads/${KEY}.webp`);
  });

  it('points local upload URLs at the CDN once, leaving other URLs alone', async () => {
    await rewriteUploadUrls(prisma, `${CDN}/`, false);
    await rewriteUploadUrls(prisma, CDN, false);
    const invitation = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId } });
    expect(invitation.photoUrl).toBe(`${CDN}/uploads/${KEY}.webp`);
    expect(invitation.customMusicUrl).toBe(`${CDN}/uploads/${KEY}.mp3`);
    expect((await prisma.invitationPhoto.findFirstOrThrow()).url).toBe(`${CDN}/uploads/${KEY}.png`);
    // Files shipped with the site stay where they are.
    expect((await prisma.track.findUniqueOrThrow({ where: { id: 'bundled' } })).file).toBe('/music/komuz.mp3');
  });

  it('refuses a CDN URL that is not https', async () => {
    await expect(rewriteUploadUrls(prisma, "http://x'; DROP TABLE \"User\"; --", false)).rejects.toThrow(/https/);
  });
});
