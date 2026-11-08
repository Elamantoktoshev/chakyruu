import type { EventType } from './catalog.js';
import { manifestOf } from './manifest.js';

/** Invitation design components. A new template = one entry here + one folder in client/src/templates. */
export const DRAWN_TEMPLATE_KEYS = ['classic', 'minimal', 'alatoo', 'nazik', 'bala', 'batyr', 'yubiley', 'shyrdak'] as const;
export type DrawnTemplateKey = (typeof DRAWN_TEMPLATE_KEYS)[number];

/** One component for every illustrated template; the look comes from its manifest (Template.config). */
export const ILLUSTRATED_TEMPLATE_KEY = 'illustrated';

export const TEMPLATE_KEYS = [...DRAWN_TEMPLATE_KEYS, ILLUSTRATED_TEMPLATE_KEY] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export interface Palette {
  id: string;
  /** Swatch label in the builder (Kyrgyz / Russian). */
  label: { ky: string; ru: string };
  /** Headings, buttons, large surfaces. */
  primary: string;
  /** Ornaments, thin lines, highlights. */
  accent: string;
  /** Page background. */
  background: string;
  /** Body text on the background. */
  ink: string;
  /** Dark background: shared blocks switch to light text. */
  isDark: boolean;
}

export interface TemplateDefinition {
  eventType: EventType;
  /** Shown under every toi type filter. */
  isUniversal: boolean;
  palettes: readonly Palette[];
}

const palette = (
  id: string,
  ky: string,
  ru: string,
  primary: string,
  accent: string,
  background: string,
  ink = '#2B1A14',
  isDark = false,
): Palette => ({ id, label: { ky, ru }, primary, accent, background, ink, isDark });

/** Palettes of the code-drawn templates (illustrated ones take theirs from the manifest). */
export const TEMPLATE_CATALOG: Readonly<Record<DrawnTemplateKey, TemplateDefinition>> = {
  classic: {
    eventType: 'WEDDING',
    isUniversal: false,
    palettes: [
      palette('bordo-gold', 'Бордо', 'Бордо', '#7A1F2B', '#C9A24B', '#FBF5EA'),
      palette('emerald-gold', 'Зумурут', 'Изумруд', '#1F4D3F', '#C9A24B', '#F6F1E6'),
      palette('navy-gold', 'Түнкү көк', 'Ночной синий', '#1E2A4A', '#C9A24B', '#F4F1EA'),
      palette('plum', 'Кара өрүк', 'Слива', '#4A1E3F', '#D4AF7A', '#FAF4F2'),
    ],
  },
  minimal: {
    eventType: 'WEDDING',
    isUniversal: false,
    palettes: [
      palette('ivory', 'Ак', 'Белый', '#2B2B2B', '#B08D57', '#FFFFFF', '#2B2B2B'),
      palette('sage', 'Шалфей', 'Шалфей', '#4A5D4F', '#A3B18A', '#FBFBF8', '#2E3A31'),
      palette('blush', 'Кызгылт', 'Румяный', '#5C3D46', '#D8A7A0', '#FFF9F8', '#3A2A2E'),
    ],
  },
  alatoo: {
    eventType: 'WEDDING',
    isUniversal: false,
    palettes: [
      palette('dawn', 'Таң', 'Рассвет', '#3B2F5E', '#F2A65A', '#FFF4EA'),
      palette('sky', 'Асман', 'Небо', '#1F4E79', '#F6C177', '#F3F8FC', '#1C2B3A'),
      palette('sunset', 'Күн батуу', 'Закат', '#5E1F3A', '#F28C50', '#FFF1E8'),
      palette('forest', 'Арча', 'Арча', '#2F4F3A', '#E3B65B', '#F4F6EF', '#22301F'),
    ],
  },
  nazik: {
    eventType: 'KYZ_UZATUU',
    isUniversal: false,
    palettes: [
      palette('powder', 'Упа', 'Пудра', '#8C4A5C', '#E7B8C1', '#FFF7F8', '#3D2329'),
      palette('lavender', 'Лаванда', 'Лаванда', '#5E4B7A', '#C9B6E4', '#FAF7FF', '#2E2540'),
      palette('peach', 'Шабдалы', 'Персик', '#8A4B3C', '#F2C3A6', '#FFF8F3', '#3E241D'),
    ],
  },
  bala: {
    eventType: 'BESHIK',
    isUniversal: false,
    palettes: [
      palette('blue', 'Көк — уул', 'Голубой — мальчик', '#2F5A80', '#9CC9EA', '#F3F9FD', '#1D3247'),
      palette('pink', 'Кызгылт — кыз', 'Розовый — девочка', '#9A4A6A', '#F2B5CC', '#FFF6FA', '#43202F'),
      palette('mint', 'Жалбыз', 'Мята', '#2F6B5E', '#A8DDCB', '#F3FBF8', '#1D3A33'),
    ],
  },
  batyr: {
    eventType: 'SUNNOT',
    isUniversal: false,
    palettes: [
      palette('navy-gold', 'Көк-алтын', 'Сине-золотой', '#14213D', '#D4AF37', '#F5F3EE', '#14213D'),
      palette('green-gold', 'Жашыл-алтын', 'Зелёно-золотой', '#1B3A2F', '#D4AF37', '#F3F5F0', '#1B2A22'),
      palette('maroon-gold', 'Кочкул-алтын', 'Бордово-золотой', '#4A1414', '#D4AF37', '#F7F2EE', '#2E1212'),
    ],
  },
  yubiley: {
    eventType: 'MAARAKE',
    isUniversal: false,
    palettes: [
      palette('black-gold', 'Кара-алтын', 'Чёрно-золотой', '#D4AF37', '#F5E6B8', '#141414', '#F2EDE3', true),
      palette('wine-gold', 'Шарап', 'Вино', '#E3C07A', '#F5E6B8', '#2A0E14', '#F5ECE6', true),
      palette('midnight', 'Түн', 'Полночь', '#C9A24B', '#E9D9A6', '#0F1A2B', '#EDEFF3', true),
    ],
  },
  shyrdak: {
    eventType: 'WEDDING',
    isUniversal: true,
    palettes: [
      palette('red-felt', 'Кызыл кийиз', 'Красный войлок', '#9B1C1C', '#E8C15A', '#F4EBDD'),
      palette('blue-felt', 'Көк кийиз', 'Синий войлок', '#1F3A6B', '#E8C15A', '#EEF1F6', '#1A2440'),
      palette('green-felt', 'Жашыл кийиз', 'Зелёный войлок', '#2F5D3A', '#E8C15A', '#F1F2EA', '#1F2D22'),
      palette('brown-felt', 'Күрөң кийиз', 'Коричневый войлок', '#5B3A22', '#E8C15A', '#F5EEE4'),
    ],
  },
};

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value);
}

export function isDrawnTemplateKey(value: string): value is DrawnTemplateKey {
  return (DRAWN_TEMPLATE_KEYS as readonly string[]).includes(value);
}

/**
 * The palette to render: the chosen one if it belongs to this template, else the template's first.
 * Illustrated templates use the colours of their manifest (`templateConfig`).
 */
export function resolvePalette(templateKey: string, paletteId: string | null | undefined, templateConfig?: unknown): Palette {
  if (templateKey === ILLUSTRATED_TEMPLATE_KEY) {
    const manifest = manifestOf(templateConfig);
    if (manifest) {
      const { primary, accent, background, ink, isDark } = manifest.palette;
      return { id: 'manifest', label: { ky: 'Шаблондун түсү', ru: 'Цвета шаблона' }, primary, accent, background, ink, isDark };
    }
  }
  const definition = TEMPLATE_CATALOG[isDrawnTemplateKey(templateKey) ? templateKey : 'classic'];
  const [first] = definition.palettes;
  if (!first) throw new Error(`Template ${templateKey} has no palettes`);
  return definition.palettes.find((candidate) => candidate.id === paletteId) ?? first;
}

export function isPaletteOf(templateKey: string, paletteId: string): boolean {
  return isDrawnTemplateKey(templateKey) && TEMPLATE_CATALOG[templateKey].palettes.some((candidate) => candidate.id === paletteId);
}
