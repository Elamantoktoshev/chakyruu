import type { PublicPage, SiteLocale } from '@chakyruu/shared';

export interface PageText {
  /** ≤ 60 characters (Google cuts longer titles). */
  title: string;
  /** ≤ 155 characters. */
  description: string;
}

/**
 * Titles and descriptions of the public pages.
 * TODO: проверка носителем — every Kyrgyz text below needs a native speaker's review.
 */
export const PAGE_TEXTS: Readonly<Record<PublicPage, Readonly<Record<SiteLocale, PageText>>>> = {
  '': {
    // TODO: проверка носителем
    ky: {
      title: 'Той чакыруу онлайн — электрондук чакыруу | Chakyruu.kg',
      description:
        'Тойго электрондук чакыруу 5 мүнөттө: боз үй анимациясы, музыка, ар бир конокко жеке шилтеме жана жооптор бир жерде. Түзүү акысыз.',
    },
    ru: {
      title: 'Электронное приглашение на той онлайн | Chakyruu.kg',
      description:
        'Приглашение на свадьбу и той за 5 минут: анимация юрты, музыка, личная ссылка каждому гостю и ответы в одном месте. Создание бесплатно.',
    },
  },
  templates: {
    // TODO: проверка носителем
    ky: {
      title: 'Той чакыруу шаблондору — даяр дизайндар | Chakyruu.kg',
      description: 'Үйлөнүү той, кыз узатуу, бешик той жана мааракеге даяр чакыруу дизайндары. Тандаңыз, текстти өзгөртүңүз — шилтеме даяр.',
    },
    ru: {
      title: 'Шаблоны приглашений на свадьбу и той | Chakyruu.kg',
      description: 'Готовые дизайны приглашений на свадьбу, кыз узатуу, бешик той и юбилей. Выберите шаблон, измените текст и отправьте ссылку гостям.',
    },
  },
  tamadalar: {
    // TODO: проверка носителем
    ky: {
      title: 'Тамадалар каталогу — тойго тамада табуу | Chakyruu.kg',
      description: 'Кыргызстандагы тамадалар: баасы, тили, бош күндөрү жана байланыш. Тойго ылайыктуу тамаданы тандап, түз жазыңыз.',
    },
    ru: {
      title: 'Каталог тамад — найти тамаду на той | Chakyruu.kg',
      description: 'Тамады Кыргызстана: цены, язык ведения, свободные даты и контакты. Выберите ведущего на той и напишите ему напрямую.',
    },
  },
  oferta: {
    // TODO: проверка носителем
    ky: { title: 'Коомдук оферта | Chakyruu.kg', description: 'Chakyruu.kg кызматын колдонуунун шарттары: чакырууну түзүү, жарыялоо жана төлөө.' },
    ru: { title: 'Публичная оферта | Chakyruu.kg', description: 'Условия использования сервиса Chakyruu.kg: создание, публикация и оплата электронных приглашений.' },
  },
  privacy: {
    // TODO: проверка носителем
    ky: { title: 'Купуялык саясаты | Chakyruu.kg', description: 'Chakyruu.kg кандай маалыматтарды чогултат, эмне үчүн колдонот жана кантип сактайт.' },
    ru: { title: 'Политика конфиденциальности | Chakyruu.kg', description: 'Какие данные собирает Chakyruu.kg, зачем они нужны и как мы их храним.' },
  },
  contacts: {
    // TODO: проверка носителем
    ky: { title: 'Байланыш | Chakyruu.kg', description: 'Chakyruu.kg менен байланышуу: WhatsApp, телефон жана реквизиттер.' },
    ru: { title: 'Контакты | Chakyruu.kg', description: 'Связаться с Chakyruu.kg: WhatsApp, телефон и реквизиты.' },
  },
};
