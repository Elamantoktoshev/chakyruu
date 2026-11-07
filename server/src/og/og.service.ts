import { EVENT_TITLES, formatEventDate, formatEventTime, resolvePalette, type Language } from '@chakyruu/shared';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma.js';
import { ogCard, storyCard, type CardContent } from './cards.js';
import { OG_SIZE, STORY_SIZE, renderPng } from './render.js';

const INVITE_LINE: Readonly<Record<Language, string>> = {
  KY: 'Сиздерди тойго чакырабыз',
  RU: 'Приглашаем вас на той',
};
const SCAN_LINE: Readonly<Record<Language, string>> = {
  KY: 'Чакырууну ачуу үчүн сканерлеңиз',
  RU: 'Отсканируйте, чтобы открыть приглашение',
};
const TIME_LOCALE: Readonly<Record<Language, string>> = { KY: 'ky-KG', RU: 'ru-RU' };

const cardSelect = {
  slug: true,
  hostNames: true,
  eventType: true,
  eventDate: true,
  venueName: true,
  photoUrl: true,
  language: true,
  paletteId: true,
  openingAnimation: true,
  updatedAt: true,
  template: { select: { componentKey: true } },
} as const;

/** Only published invitations get preview pictures (drafts must not leak through a guessed slug). */
export async function findPublishedCard(slug: string) {
  return prisma.invitation.findFirst({ where: { slug, status: 'PUBLISHED' }, select: cardSelect });
}

export type CardRow = NonNullable<Awaited<ReturnType<typeof findPublishedCard>>>;

export function cardContent(row: CardRow): CardContent {
  const lang = row.language;
  const iso = row.eventDate?.toISOString() ?? null;
  return {
    eyebrow: EVENT_TITLES[lang][row.eventType].toUpperCase(),
    names: row.hostNames,
    inviteLine: INVITE_LINE[lang],
    dateLine: iso ? `${formatEventDate(iso, lang).date} · ${formatEventTime(iso, TIME_LOCALE[lang])}` : null,
    venue: row.venueName || null,
    scanLine: SCAN_LINE[lang],
    palette: resolvePalette(row.template.componentKey, row.paletteId),
  };
}

/** Small LRU: a preview is ~100 KB, so 100 entries stay well under 20 MB. */
class PngCache {
  private entries = new Map<string, Promise<Buffer>>();

  constructor(private readonly maxEntries: number) {}

  get(key: string, render: () => Promise<Buffer>): Promise<Buffer> {
    const hit = this.entries.get(key);
    if (hit) {
      this.entries.delete(key);
      this.entries.set(key, hit);
      return hit;
    }
    // Cache the promise: parallel requests for the same picture render it once.
    const pending = render().catch((error: unknown) => {
      this.entries.delete(key);
      throw error;
    });
    this.entries.set(key, pending);
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    return pending;
  }
}

export type PictureKind = 'og' | 'story';

const QR_SIZE = 600;

export interface PictureRenderer {
  /** null when there is no published invitation with this slug. */
  render(slug: string, kind: PictureKind): Promise<{ png: Buffer; version: number } | null>;
}

export function createPictureRenderer({ appUrl, maxEntries = 100 }: { appUrl: string; maxEntries?: number }): PictureRenderer {
  const cache = new PngCache(maxEntries);

  async function draw(row: CardRow, kind: PictureKind): Promise<Buffer> {
    const content = cardContent(row);
    if (kind === 'og') return renderPng(ogCard(content), OG_SIZE);
    const url = `${appUrl}/${row.slug}`;
    const qr = await QRCode.toDataURL(url, { width: QR_SIZE, margin: 0, errorCorrectionLevel: 'M' });
    return renderPng(storyCard(content, qr, url.replace(/^https?:\/\//, '')), STORY_SIZE);
  }

  return {
    async render(slug, kind) {
      const row = await findPublishedCard(slug);
      if (!row) return null;
      const version = row.updatedAt.getTime();
      // Editing the invitation changes updatedAt, which makes a new cache entry.
      const png = await cache.get(`${kind}:${slug}:${version}`, () => draw(row, kind));
      return { png, version };
    },
  };
}

/** QR code of the invitation link for printing (PNG). */
export async function invitationQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: 'png', width: 1024, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#1f1b1a', light: '#ffffff' } });
}
