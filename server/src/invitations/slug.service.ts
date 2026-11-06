import { randomBytes } from 'node:crypto';
import { baseSlugFor, slugWithSuffix } from '@chakyruu/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const DRAFT_SLUG_BYTES = 5;

/** Placeholder slug until the host names are known ("draft-" is reserved, so it never clashes). */
export function temporaryDraftSlug(): string {
  return `draft-${randomBytes(DRAFT_SLUG_BYTES).toString('hex')}`;
}

/**
 * First free slug for these host names: "aibek-aizada", then "aibek-aizada-2", …
 * `currentId` lets an invitation keep a slug it already owns.
 */
export async function allocateSlug(hostNames: string, currentId: string): Promise<string> {
  const base = baseSlugFor(hostNames);
  const taken = await prisma.invitation.findMany({
    where: { slug: { startsWith: base }, NOT: { id: currentId } },
    select: { slug: true },
  });
  const takenSlugs = new Set(taken.map((row) => row.slug));
  for (let attempt = 1; ; attempt += 1) {
    const candidate = slugWithSuffix(base, attempt);
    if (!takenSlugs.has(candidate)) return candidate;
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
