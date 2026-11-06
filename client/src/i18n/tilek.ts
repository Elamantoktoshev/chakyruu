const ky = {
  tilekTitle: 'Тилектер',
  tilekSubtitle: 'Жаштарга жылуу сөз калтырыңыз',
  tilekNameLabel: 'Атыңыз',
  tilekTextLabel: 'Тилегиңиз',
  tilekTextPlaceholder: 'Бактылуу болгула, ак жол!',
  tilekSend: 'Тилек калтыруу',
  tilekSending: 'Жөнөтүлүүдө…',
  tilekEmpty: 'Биринчи тилекти сиз калтырыңыз 🌸',
  tilekThanks: 'Рахмат! Тилегиңиз кошулду',
  tilekLike: 'Жакты',
  tilekErrorText: 'Тилек жазыңыз (кеминде 2 тамга)',
  tilekHide: 'Жашыруу',
  tilekShow: 'Көрсөтүү',
  tilekHidden: 'Жашырылган',
  tilekModerationEmpty: 'Азырынча тилек жок',
};

export type TilekDict = typeof ky;

const ru: TilekDict = {
  tilekTitle: 'Тилектер — пожелания',
  tilekSubtitle: 'Оставьте тёплые слова',
  tilekNameLabel: 'Ваше имя',
  tilekTextLabel: 'Пожелание',
  tilekTextPlaceholder: 'Счастья вам и ак жол!',
  tilekSend: 'Оставить пожелание',
  tilekSending: 'Отправка…',
  tilekEmpty: 'Оставьте первое пожелание 🌸',
  tilekThanks: 'Спасибо! Пожелание добавлено',
  tilekLike: 'Нравится',
  tilekErrorText: 'Напишите пожелание (минимум 2 буквы)',
  tilekHide: 'Скрыть',
  tilekShow: 'Показать',
  tilekHidden: 'Скрыто',
  tilekModerationEmpty: 'Пока нет пожеланий',
};

export const tilekDict = { ky, ru };
