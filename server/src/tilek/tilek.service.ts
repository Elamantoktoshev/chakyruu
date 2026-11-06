import { TILEK_PAGE_SIZE, type CreateTilekInput } from '@chakyruu/shared';
import type { PolicyUser } from '../auth/policy.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { findManagedInvitation } from '../invitations/access.js';
import { isUniqueViolation } from '../invitations/slug.service.js';

const publicTilekSelect = { id: true, authorName: true, text: true, likesCount: true, createdAt: true } as const;

async function findPublishedId(slug: string): Promise<string> {
  const invitation = await prisma.invitation.findFirst({ where: { slug, status: 'PUBLISHED' }, select: { id: true } });
  if (!invitation) throw new HttpError(404, 'Invitation not found');
  return invitation.id;
}

/** Visible wishes, newest first, with whether this browser already liked each one. */
export async function listPublicTilekter(slug: string, clientId: string | undefined) {
  const invitationId = await findPublishedId(slug);
  const tilekter = await prisma.tilek.findMany({
    where: { invitationId, hidden: false },
    orderBy: { createdAt: 'desc' },
    take: TILEK_PAGE_SIZE,
    select: { ...publicTilekSelect, likes: clientId ? { where: { clientId }, select: { clientId: true } } : false },
  });
  return tilekter.map(({ likes, ...tilek }) => ({ ...tilek, likedByMe: Array.isArray(likes) && likes.length > 0 }));
}

export async function createTilek(slug: string, input: CreateTilekInput) {
  const invitationId = await findPublishedId(slug);
  const guest = input.token
    ? await prisma.guest.findFirst({ where: { token: input.token, invitationId }, select: { id: true, name: true } })
    : null;
  // A personal link signs the wish with the guest's name; otherwise a typed name is required.
  const authorName = guest?.name ?? input.authorName;
  if (!authorName) throw new HttpError(400, 'Please write your name');

  const tilek = await prisma.tilek.create({
    data: { invitationId, guestId: guest?.id ?? null, authorName, text: input.text },
    select: publicTilekSelect,
  });
  return { ...tilek, likedByMe: false };
}

/** Idempotent per browser: the (tilekId, clientId) primary key rejects a second like. */
export async function likeTilek(tilekId: string, clientId: string) {
  const tilek = await prisma.tilek.findFirst({
    where: { id: tilekId, hidden: false, invitation: { status: 'PUBLISHED' } },
    select: { id: true },
  });
  if (!tilek) throw new HttpError(404, 'Tilek not found');

  try {
    const [, updated] = await prisma.$transaction([
      prisma.tilekLike.create({ data: { tilekId, clientId } }),
      prisma.tilek.update({ where: { id: tilekId }, data: { likesCount: { increment: 1 } }, select: { likesCount: true } }),
    ]);
    return { likesCount: updated.likesCount, liked: true };
  } catch (error: unknown) {
    if (!isUniqueViolation(error)) throw error;
    const current = await prisma.tilek.findUniqueOrThrow({ where: { id: tilekId }, select: { likesCount: true } });
    return { likesCount: current.likesCount, liked: true };
  }
}

const ownerTilekSelect = { ...publicTilekSelect, hidden: true, guestId: true } as const;

export async function listOwnerTilekter(invitationId: string, user: PolicyUser) {
  await findManagedInvitation(invitationId, user);
  return prisma.tilek.findMany({ where: { invitationId }, orderBy: { createdAt: 'desc' }, select: ownerTilekSelect });
}

export async function setTilekHidden(invitationId: string, tilekId: string, hidden: boolean, user: PolicyUser) {
  await findManagedInvitation(invitationId, user);
  const { count } = await prisma.tilek.updateMany({ where: { id: tilekId, invitationId }, data: { hidden } });
  if (count === 0) throw new HttpError(404, 'Tilek not found');
  return prisma.tilek.findUniqueOrThrow({ where: { id: tilekId }, select: ownerTilekSelect });
}
