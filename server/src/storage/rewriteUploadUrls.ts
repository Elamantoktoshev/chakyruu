import type { PrismaClient } from '@prisma/client';

const LOCAL_PREFIX = '/uploads/';

/** Every column that stores a URL of an uploaded file. Fixed identifiers — never user input. */
const URL_COLUMNS = [
  ['Invitation', 'photoUrl'],
  ['Invitation', 'customMusicUrl'],
  ['InvitationPhoto', 'url'],
  ['Organization', 'logoUrl'],
  ['TamadaProfile', 'photoUrl'],
  ['Track', 'file'],
] as const;

export interface RewriteCount {
  column: string;
  count: number;
}

/**
 * "/uploads/<key>" → "<cdnUrl>/uploads/<key>" in every upload column (moving to Spaces).
 * Only local URLs are touched, so running it twice changes nothing. Dry run only counts.
 */
export async function rewriteUploadUrls(prisma: PrismaClient, cdnUrl: string, isDryRun: boolean): Promise<RewriteCount[]> {
  const base = cdnUrl.replace(/\/+$/, '');
  if (!/^https:\/\/[^\s'"]+$/.test(base)) throw new Error(`CDN URL must be https://…, got "${cdnUrl}"`);
  const counts: RewriteCount[] = [];
  for (const [table, column] of URL_COLUMNS) {
    const where = `"${column}" LIKE '${LOCAL_PREFIX}%'`;
    const [row] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT count(*) AS count FROM "${table}" WHERE ${where}`);
    const count = Number(row?.count ?? 0);
    if (count > 0 && !isDryRun) {
      // $1 is a bound parameter: the CDN URL never becomes part of the SQL text.
      await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "${column}" = $1 || "${column}" WHERE ${where}`, base);
    }
    counts.push({ column: `${table}.${column}`, count });
  }
  return counts;
}
