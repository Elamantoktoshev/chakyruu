import { ILLUSTRATED_TEMPLATE_KEY, parseManifest, safeParseManifest, type OpeningKind, type TemplateFeature } from '@chakyruu/shared';
import type { Prisma, PrismaClient, TemplateType } from '@prisma/client';

/**
 * Illustrated designs (one manifest each, artwork in client/public/templates/<slug>/ — see README).
 * Code owns the manifest look (palette, opening, features); /admin owns name, type, order, price,
 * badge, on/off, card text and uploaded artwork, so a deploy never undoes an admin edit.
 */
interface IllustratedSeed {
  id: string;
  name: string;
  type: TemplateType;
  sortOrder: number;
  description: { ky: string; ru: string };
  slug: string;
  opening: OpeningKind;
  /** primary, accent, background, ink, card (pastel behind the catalog phone). */
  colors: readonly [string, string, string, string, string];
  isDark?: boolean;
  features?: readonly TemplateFeature[];
}

const STANDARD_FEATURES: readonly TemplateFeature[] = ['envelope', 'kyrgyz', 'map', 'rsvp', 'music'];

export const ILLUSTRATED_TEMPLATES: readonly IllustratedSeed[] = [
  {
    id: 'tpl-art-archa-bakchasy', name: 'Арча бакчасы', type: 'WEDDING', sortOrder: 100, slug: 'archa-bakchasy', opening: 'branches',
    colors: ['#1F5C57', '#D8B26E', '#F3F7F4', '#1E2B28', '#DDEDE8'],
    description: { ky: 'Арча бутактары ачылып, таңкы Ала-Тоо көрүнөт.', ru: 'Ветви арчи расходятся и открывают рассвет над Ала-Тоо.' },
  },
  {
    id: 'tpl-art-ak-kalpak', name: 'Ак калпак', type: 'WEDDING', sortOrder: 101, slug: 'ak-kalpak', opening: 'hands',
    colors: ['#1E1E1E', '#C9A24B', '#FAF8F3', '#1E1E1E', '#ECE8DF'],
    description: { ky: 'Конверт колго берилет, мөөрүндө ак калпактын оюусу.', ru: 'Конверт подают в руки, на печати — узор ак калпака.' },
  },
  {
    id: 'tpl-art-dastorkon', name: 'Дасторкон', type: 'WEDDING', sortOrder: 102, slug: 'dastorkon', opening: 'cloche',
    colors: ['#5A1626', '#D9B26A', '#FBF4EE', '#2A1416', '#F1DFE0'],
    description: { ky: 'Күмүш капкак көтөрүлүп, дасторкондун ортосунда чакыруу.', ru: 'Серебряная крышка поднимается — приглашение в центре дастархана.' },
  },
  {
    id: 'tpl-art-eki-zhurok', name: 'Эки жүрөк', type: 'WEDDING', sortOrder: 103, slug: 'eki-zhurok', opening: 'portrait',
    colors: ['#8C4A5C', '#D4AF7A', '#FFF7F6', '#3D2329', '#F8E3E6'],
    description: { ky: 'Жубайлардын портрети ою рамкада акырындап ачылат.', ru: 'Портрет пары медленно проявляется в рамке из орнамента.' },
    features: [...STANDARD_FEATURES, 'gallery'],
  },
  {
    id: 'tpl-art-ysyk-kol-tunu', name: 'Ысык-Көл түнү', type: 'WEDDING', sortOrder: 104, slug: 'ysyk-kol-tunu', opening: 'tunduk',
    colors: ['#13294B', '#C7D3E3', '#0E1A2E', '#EEF2F7', '#DCE3EE'], isDark: true,
    description: { ky: 'Түнкү көл, жылдыздар жана жарык түшкөн түндүк.', ru: 'Ночное озеро, звёзды и свет через түндүк.' },
  },
  {
    id: 'tpl-art-anar-bakchasy', name: 'Анар бакчасы', type: 'WEDDING', sortOrder: 105, slug: 'anar-bakchasy', opening: 'branches',
    colors: ['#9C3D3A', '#E2B66B', '#FFF8F1', '#3A2220', '#F7E4D9'],
    description: { ky: 'Анар бактары жана канаттуулар — жылуу пастель түстөрдө.', ru: 'Гранатовый сад и птицы в тёплых пастельных тонах.' },
  },
  {
    id: 'tpl-art-kyzyl-kiyiz', name: 'Кызыл кийиз', type: 'KYZ_UZATUU', sortOrder: 110, slug: 'kyzyl-kiyiz', opening: 'carpet',
    colors: ['#9B1C1C', '#E8C15A', '#F6ECE1', '#2E1A14', '#F3DCD6'],
    description: { ky: 'Кызыл шырдак жайылып, ортосунда ою медальону.', ru: 'Разворачивается красный шырдак с медальоном в центре.' },
  },
  {
    id: 'tpl-art-tushkiyiz', name: 'Тушкийиз', type: 'KYZ_UZATUU', sortOrder: 111, slug: 'tushkiyiz', opening: 'carpet',
    colors: ['#6B1F35', '#E3B873', '#FBF2F0', '#321620', '#EFDCE0'],
    description: { ky: 'Саймалуу тушкийиз ачылып, кыз узатууга чакырат.', ru: 'Раскрывается вышитый тушкийиз — приглашение на проводы невесты.' },
  },
  {
    id: 'tpl-art-elechek', name: 'Элечек', type: 'KYZ_UZATUU', sortOrder: 112, slug: 'elechek', opening: 'portrait',
    colors: ['#A3262A', '#D9B26A', '#FFF9F2', '#3B1A16', '#F6E6DA'],
    description: { ky: 'Ак элечек жана кызыл оюу — салттуу жана назик.', ru: 'Белый элечек и красный орнамент — традиционно и нежно.' },
  },
  {
    id: 'tpl-art-zhailoo-boz-uy', name: 'Жайлоодогу боз үй', type: 'KYZ_UZATUU', sortOrder: 113, slug: 'zhailoo-boz-uy', opening: 'boz-uy',
    colors: ['#2F5D3A', '#E2C267', '#F2F6EE', '#1F2D22', '#DFECDD'],
    description: { ky: 'Жашыл жайлоо, боз үйдүн эшиги конокторго ачылат.', ru: 'Зелёное джайлоо, двери юрты открываются для гостей.' },
  },
  {
    id: 'tpl-art-zhibek-zhol', name: 'Жибек жол', type: 'KYZ_UZATUU', sortOrder: 114, slug: 'zhibek-zhol', opening: 'envelope',
    colors: ['#1C6B6E', '#D4A857', '#F2F8F7', '#173235', '#D8ECEA'],
    description: { ky: 'Бирюза жана алтын: мөөр сынып, конверт ачылат.', ru: 'Бирюза и золото: печать ломается, конверт открывается.' },
  },
  {
    id: 'tpl-art-altyn-toy', name: 'Алтын той', type: 'MAARAKE', sortOrder: 120, slug: 'altyn-toy', opening: 'envelope',
    colors: ['#D4AF37', '#F5E6B8', '#141414', '#F2EDE3', '#EDE3C9'], isDark: true,
    description: { ky: 'Кара жана алтын — юбилей жана мааракелер үчүн салтанат.', ru: 'Чёрное с золотом — торжество для юбилеев и годовщин.' },
    features: [...STANDARD_FEATURES, 'countdown'],
  },
];

/** The manifest of one seed, validated (an invalid one stops the deploy instead of breaking pages). */
export function manifestOfSeed(seed: IllustratedSeed) {
  const [primary, accent, background, ink, card] = seed.colors;
  return parseManifest({
    version: 1,
    slug: seed.slug,
    palette: { primary, accent, background, ink, card, isDark: seed.isDark ?? false },
    font: 'serif',
    opening: { kind: seed.opening, layers: [] },
    features: seed.features ?? STANDARD_FEATURES,
  });
}

export async function seedIllustratedTemplates(prisma: PrismaClient): Promise<void> {
  for (const seed of ILLUSTRATED_TEMPLATES) {
    const manifest = manifestOfSeed(seed);
    const existing = await prisma.template.findUnique({ where: { id: seed.id }, select: { config: true } });
    if (!existing) {
      await prisma.template.create({
        data: {
          id: seed.id,
          name: seed.name,
          type: seed.type,
          componentKey: ILLUSTRATED_TEMPLATE_KEY,
          sortOrder: seed.sortOrder,
          badge: 'NEW',
          description: seed.description,
          config: manifest as unknown as Prisma.InputJsonObject,
        },
      });
      continue;
    }
    // Keep what was uploaded in /admin; refresh only the look that lives in code.
    const previous = safeParseManifest(existing.config);
    const config = { ...manifest, uploads: previous?.uploads ?? {}, placeholders: previous?.placeholders ?? {}, uploadKeys: previous?.uploadKeys ?? {} };
    await prisma.template.update({ where: { id: seed.id }, data: { componentKey: ILLUSTRATED_TEMPLATE_KEY, config: config as unknown as Prisma.InputJsonObject } });
  }
}
