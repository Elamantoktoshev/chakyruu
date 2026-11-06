import { randomBytes } from 'node:crypto';
import { MAX_GUESTS_PER_INVITATION, parseGuestList, type GuestStatus } from '@chakyruu/shared';
import type { PolicyUser } from '../auth/policy.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { findManagedInvitation } from '../invitations/access.js';

const GUEST_TOKEN_BYTES = 16;

/** 128-bit secret for /:slug?g=<token> (22 url-safe chars). */
export function generateGuestToken(): string {
  return randomBytes(GUEST_TOKEN_BYTES).toString('base64url');
}

export const guestSelect = {
  id: true,
  name: true,
  phone: true,
  token: true,
  status: true,
  guestsCount: true,
  source: true,
  respondedAt: true,
  createdAt: true,
} as const;

export async function listGuests(invitationId: string, user: PolicyUser, status?: GuestStatus) {
  await findManagedInvitation(invitationId, user);
  return prisma.guest.findMany({
    where: { invitationId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'asc' },
    select: guestSelect,
  });
}

const normalise = (name: string): string => name.toLocaleLowerCase('ru');

/** Paste "one name per line"; names already on the list are skipped so re-pasting is harmless. */
export async function addGuests(invitationId: string, user: PolicyUser, text: string) {
  await findManagedInvitation(invitationId, user);
  const parsed = parseGuestList(text);
  if (parsed.length === 0) throw new HttpError(400, 'Add at least one name, one per line');

  const existing = await prisma.guest.findMany({ where: { invitationId }, select: { name: true } });
  const existingNames = new Set(existing.map((guest) => normalise(guest.name)));
  const fresh = parsed.filter((guest) => !existingNames.has(normalise(guest.name)));
  if (existing.length + fresh.length > MAX_GUESTS_PER_INVITATION) {
    throw new HttpError(400, `An invitation can have at most ${MAX_GUESTS_PER_INVITATION} guests`);
  }

  const created = await prisma.guest.createManyAndReturn({
    data: fresh.map((guest) => ({ ...guest, invitationId, token: generateGuestToken() })),
    select: guestSelect,
  });
  // createManyAndReturn does not guarantee order; keep the pasted order.
  const order = new Map(fresh.map((guest, index) => [guest.name, index]));
  const sorted = [...created].sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0));
  return { created: sorted, skipped: parsed.length - fresh.length };
}

export async function deleteGuest(invitationId: string, guestId: string, user: PolicyUser): Promise<void> {
  await findManagedInvitation(invitationId, user);
  const { count } = await prisma.guest.deleteMany({ where: { id: guestId, invitationId } });
  if (count === 0) throw new HttpError(404, 'Guest not found');
}
