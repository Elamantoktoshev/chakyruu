import type { EventType } from '@chakyruu/shared';

const ky = {
  eventTypes: {
    WEDDING: 'Үйлөнүү той',
    KYZ_UZATUU: 'Кыз узатуу',
    BESHIK: 'Бешик той',
    SUNNOT: 'Сүннөт той',
    MAARAKE: 'Маараке',
  } satisfies Record<EventType, string>,
  inviteSubtitle: {
    WEDDING: 'Сиздерди үйлөнүү тоюбузга чакырабыз',
    KYZ_UZATUU: 'Сиздерди кыз узатуу тоюбузга чакырабыз',
    BESHIK: 'Сиздерди бешик тоюбузга чакырабыз',
    SUNNOT: 'Сиздерди сүннөт тоюбузга чакырабыз',
    MAARAKE: 'Сиздерди мааракебизге чакырабыз',
  } satisfies Record<EventType, string>,
  adultsOnly: '18+ · Чоңдор үчүн гана',
  draftBanner: 'Черновик — бул баракты сиз гана көрөсүз',
  draftBannerAction: 'Түзөтүү',
  dateTbd: 'Күнү кийин белгиленет',
  musicPlay: 'Музыканы угуу',
  musicPause: 'Музыканы токтотуу',
  previewRsvpHint: 'Конокторуңуз бул жерден жооп беришет',
  rsvpChangeHint: 'Жообуңузду каалаган убакта өзгөртсөңүз болот',
};

export type InvitationDict = typeof ky;

const ru: InvitationDict = {
  eventTypes: {
    WEDDING: 'Свадьба',
    KYZ_UZATUU: 'Проводы невесты',
    BESHIK: 'Бешик той',
    SUNNOT: 'Сүннөт той',
    MAARAKE: 'Юбилей',
  },
  inviteSubtitle: {
    WEDDING: 'Приглашаем вас на нашу свадьбу',
    KYZ_UZATUU: 'Приглашаем вас на проводы невесты',
    BESHIK: 'Приглашаем вас на бешик той',
    SUNNOT: 'Приглашаем вас на сүннөт той',
    MAARAKE: 'Приглашаем вас на наш юбилей',
  },
  adultsOnly: '18+ · Только для взрослых',
  draftBanner: 'Черновик — эту страницу видите только вы',
  draftBannerAction: 'Редактировать',
  dateTbd: 'Дата будет объявлена',
  musicPlay: 'Включить музыку',
  musicPause: 'Выключить музыку',
  previewRsvpHint: 'Здесь гости ответят на приглашение',
  rsvpChangeHint: 'Ответ можно изменить в любой момент',
};

export const invitationDict = { ky, ru };
