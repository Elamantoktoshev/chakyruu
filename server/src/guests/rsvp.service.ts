import { MAX_GUESTS_PER_INVITATION, rsvpSchema } from '@chakyruu/shared';
import type { z } from 'zod';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { generateGuestToken } from './guest.service.js';

type RsvpBody = z.output<typeof rsvpSchema>;

/** What the invitation page may know about the guest — never the token or phone. */
export const publicGuestSelect = { name: true, status: true, guestsCount: true } as const;

/** Self-registrations on the shared link may not grow a list without bound. */
const MAX_TOTAL_GUESTS = MAX_GUESTS_PER_INVITATION * 2;

async function findPublishedId(slug: string): Promise<string> {
  const invitation = await prisma.invitation.findFirst({ where: { slug, status: 'PUBLISHED' }, select: { id: true } });
  if (!invitation) throw new HttpError(404, 'Invitation not found');
  return invitation.id;
}

/** Guest behind a personal link, only if the token belongs to this invitation. */
export async function findGuestByToken(invitationId: string, token: string | undefined) {
  if (!token) return null;
  return prisma.guest.findFirst({ where: { token, invitationId }, select: publicGuestSelect });
}

export interface RsvpResult {
  guest: { name: string; status: string; guestsCount: number };
  /** Returned to a new self-registered guest so the browser can change the answer later. */
  token: string | null;
  created: boolean;
}

export async function answerRsvp(slug: string, body: RsvpBody): Promise<RsvpResult> {
  const invitationId = await findPublishedId(slug);
  const answer = {
    status: body.attending ? ('ATTENDING' as const) : ('DECLINED' as const),
    guestsCount: body.guestsCount,
    respondedAt: new Date(),
  };

  if (body.token) {
    const { count } = await prisma.guest.updateMany({ where: { token: body.token, invitationId }, data: answer });
    if (count === 0) throw new HttpError(404, 'Guest not found');
    const guest = await prisma.guest.findUniqueOrThrow({ where: { token: body.token }, select: publicGuestSelect });
    return { guest, token: null, created: false };
  }

  if ((await prisma.guest.count({ where: { invitationId } })) >= MAX_TOTAL_GUESTS) {
    throw new HttpError(409, 'This invitation is not accepting more answers');
  }
  const token = generateGuestToken();
  const guest = await prisma.guest.create({
    data: { ...answer, invitationId, token, name: body.name ?? '', source: 'SELF' },
    select: publicGuestSelect,
  });
  return { guest, token, created: true };
}
