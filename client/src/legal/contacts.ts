import { SITE_CONTACTS } from '../config/site';
import type { LegalTexts } from './types';

/** Contacts page (KY/RU). WhatsApp / Instagram / e-mail come from config/site.ts. */
export const CONTACTS: LegalTexts = {
  RU: {
    title: 'Контакты',
    updated: '',
    sections: [
      {
        heading: 'Связаться с нами',
        paragraphs: [
          `WhatsApp: ${SITE_CONTACTS.whatsapp}`,
          `E-mail: ${SITE_CONTACTS.email}`,
          `Instagram: @${SITE_CONTACTS.instagram}`,
          'Время ответа: [ЗАПОЛНИТЬ: часы работы, например ежедневно 9:00–21:00 (Бишкек)]',
        ],
      },
      {
        heading: 'Для тойкан и тамад',
        paragraphs: ['Оставьте заявку внизу главной страницы — мы позвоним и расскажем о пакетах приглашений для ваших клиентов.'],
      },
      {
        heading: 'Реквизиты',
        paragraphs: [
          '[ЗАПОЛНИТЬ: ФИО индивидуального предпринимателя или название ОсОО]',
          'ИНН [ЗАПОЛНИТЬ: ИНН]',
          'Адрес: [ЗАПОЛНИТЬ: юридический адрес]',
        ],
      },
    ],
  },
  KY: {
    title: 'Байланыш',
    updated: '',
    sections: [
      {
        heading: 'Биз менен байланышуу',
        paragraphs: [
          `WhatsApp: ${SITE_CONTACTS.whatsapp}`,
          `E-mail: ${SITE_CONTACTS.email}`,
          `Instagram: @${SITE_CONTACTS.instagram}`,
          'Жооп берүү убактысы: [ЗАПОЛНИТЬ: иш убактысы, мисалы күн сайын 9:00–21:00 (Бишкек)]',
        ],
      },
      {
        heading: 'Тойканалар жана тамадалар үчүн',
        paragraphs: ['Башкы барактын ылдый жагында өтүнмө калтырыңыз — биз чалып, кардарларыңыз үчүн чакыруу пакеттери тууралуу айтып беребиз.'],
      },
      {
        heading: 'Реквизиттер',
        paragraphs: [
          '[ЗАПОЛНИТЬ: жеке ишкердин аты-жөнү же ЖЧКнын аталышы]',
          'ИСН [ЗАПОЛНИТЬ: ИНН]',
          'Дареги: [ЗАПОЛНИТЬ: юридикалык дарек]',
        ],
      },
    ],
  },
};
