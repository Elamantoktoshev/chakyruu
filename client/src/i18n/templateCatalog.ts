import type { TemplateFeature } from '@chakyruu/shared';
import type { TemplateBadge } from '../api/types';

const ky = {
  tplCatalogEyebrow: 'Каталог',
  /** The word after the space is set in italics. */
  tplCatalogTitle: 'Даяр дизайндар',
  tplCatalogSubtitle: 'Дизайнды тандаңыз, текстти өзгөртүңүз — чакыруу бир шилтеме менен даяр.',
  tplCustomize: 'Ыңгайлаштыруу',
  tplSeeAll: 'Бардык дизайндар',
  tplEmpty: 'Бул категорияда азырынча дизайн жок — жакында кошулат.',
  tplPriceSom: '{price} сом',
  tplBadges: { HIT: 'ХИТ', NEW: 'ЖАҢЫ' } satisfies Record<TemplateBadge, string>,
  tplFeatures: {
    envelope: 'Анимациялуу ачылуу',
    kyrgyz: 'Кыргыз тилинде',
    map: '2ГИС',
    rsvp: 'RSVP',
    music: 'Музыка',
    countdown: 'Артка санак',
    gallery: 'Сүрөт галереясы',
  } satisfies Record<TemplateFeature, string>,
  /** Tags of the code-drawn templates (they have no manifest). */
  tplDrawnFeatures: ['envelope', 'kyrgyz', 'map', 'rsvp', 'music'] as readonly TemplateFeature[],
};

export type TemplateCatalogDict = typeof ky;

const ru: TemplateCatalogDict = {
  tplCatalogEyebrow: 'Каталог',
  tplCatalogTitle: 'Дизайны приглашений',
  tplCatalogSubtitle: 'Выберите дизайн, поменяйте текст — приглашение готово одной ссылкой.',
  tplCustomize: 'Настроить под себя',
  tplSeeAll: 'Все дизайны',
  tplEmpty: 'В этой категории пока нет дизайнов — скоро добавим.',
  tplPriceSom: '{price} сом',
  tplBadges: { HIT: 'ХИТ', NEW: 'НОВИНКА' },
  tplFeatures: {
    envelope: 'Анимация открытия',
    kyrgyz: 'На кыргызском',
    map: '2ГИС',
    rsvp: 'RSVP',
    music: 'Музыка',
    countdown: 'Обратный отсчёт',
    gallery: 'Фотогалерея',
  },
  tplDrawnFeatures: ['envelope', 'kyrgyz', 'map', 'rsvp', 'music'],
};

export const templateCatalogDict = { ky, ru };
