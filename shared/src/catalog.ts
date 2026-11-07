/** Kinds of toi. Must match the Prisma `TemplateType` enum. */
export const EVENT_TYPES = ['WEDDING', 'KYZ_UZATUU', 'BESHIK', 'SUNNOT', 'MAARAKE'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const LANGUAGES = ['KY', 'RU'] as const;
export type Language = (typeof LANGUAGES)[number];

export const PAYMENT_PROVIDERS = ['MBANK', 'ODENGI', 'ELSOM'] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number];

/** Human names of the toi kinds (calendar entries, link previews). */
export const EVENT_TITLES: Readonly<Record<Language, Readonly<Record<EventType, string>>>> = {
  KY: { WEDDING: 'Үйлөнүү той', KYZ_UZATUU: 'Кыз узатуу', BESHIK: 'Бешик той', SUNNOT: 'Сүннөт той', MAARAKE: 'Маараке' },
  RU: { WEDDING: 'Свадьба', KYZ_UZATUU: 'Кыз узатуу', BESHIK: 'Бешик той', SUNNOT: 'Сүннөт той', MAARAKE: 'Юбилей' },
};
