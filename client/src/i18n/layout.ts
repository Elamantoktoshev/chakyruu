const ky = {
  brand: 'Chakyruu.kg',
  navLogin: 'Кирүү',
  navDashboard: 'Кабинет',
  navCreate: 'Чакыруу түзүү',
  navPartner: 'Өнөктөш',
  navAdmin: 'Админ',
};

export type LayoutDict = typeof ky;

const ru: LayoutDict = {
  brand: 'Chakyruu.kg',
  navLogin: 'Войти',
  navDashboard: 'Кабинет',
  navCreate: 'Создать приглашение',
  navPartner: 'Партнёр',
  navAdmin: 'Админ',
};

export const layoutDict = { ky, ru };
