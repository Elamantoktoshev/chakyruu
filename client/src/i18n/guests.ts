import type { GuestStatus } from '@chakyruu/shared';

const ky = {
  guestsHeading: 'Коноктор',
  guestStatus: {
    INVITED: 'Жооп жок',
    ATTENDING: 'Келет',
    DECLINED: 'Келбейт',
  } satisfies Record<GuestStatus, string>,
  guestFilterAll: 'Баары',
  addGuestsTitle: 'Конокторду кошуу',
  addGuestsHint: 'Ар бир сапка бир ысым. Номерди аягына жазсаңыз болот: Асан байке +996700123456',
  addGuestsPlaceholder: 'Асан байке\nАйгүл эже +996555123456\nНурлан Асанов',
  addGuestsButton: 'Кошуу',
  adding: 'Кошулууда…',
  addedGuests: 'Кошулду: {n}',
  skippedGuests: 'Тизмеде бар болгондуктан өткөрүлдү: {n}',
  noGuests: 'Азырынча конок жок. Тизмени жогоруга кошуңуз.',
  guestPeople: '{n} киши',
  selfRegistered: 'Жалпы шилтеме аркылуу',
  sendWhatsApp: 'WhatsApp',
  copyGuestLink: 'Көчүрүү',
  deleteGuest: 'Өчүрүү',
  confirmDeleteGuest: 'Бул конокту өчүрөсүзбү?',
  sharedLinkTitle: 'Жалпы шилтеме',
  sharedLinkHint: 'Ким болбосун ачып, атын жазып жооп бере алат',
};

export type GuestsDict = typeof ky;

const ru: GuestsDict = {
  guestsHeading: 'Гости',
  guestStatus: {
    INVITED: 'Нет ответа',
    ATTENDING: 'Придёт',
    DECLINED: 'Не придёт',
  },
  guestFilterAll: 'Все',
  addGuestsTitle: 'Добавить гостей',
  addGuestsHint: 'Одно имя на строку. Номер можно дописать в конце: Асан байке +996700123456',
  addGuestsPlaceholder: 'Асан байке\nАйгүл эже +996555123456\nНурлан Асанов',
  addGuestsButton: 'Добавить',
  adding: 'Добавляем…',
  addedGuests: 'Добавлено: {n}',
  skippedGuests: 'Уже были в списке, пропущено: {n}',
  noGuests: 'Пока нет гостей. Добавьте список выше.',
  guestPeople: '{n} чел.',
  selfRegistered: 'Через общую ссылку',
  sendWhatsApp: 'WhatsApp',
  copyGuestLink: 'Копировать',
  deleteGuest: 'Удалить',
  confirmDeleteGuest: 'Удалить этого гостя?',
  sharedLinkTitle: 'Общая ссылка',
  sharedLinkHint: 'Любой может открыть, вписать имя и ответить',
};

export const guestsDict = { ky, ru };
