const ky = {
  dashboardTitle: 'Менин чакырууларым',
  dashboardEmpty: 'Азырынча чакыруу жок. Биринчисин түзүңүз!',
  statusDraft: 'Черновик',
  statusPaid: 'Төлөндү',
  statusPublished: 'Жарыяланды',
  statComing: 'Келет',
  statPeople: 'Киши',
  statDeclined: 'Келбейт',
  statNoAnswer: 'Жооп жок',
  noDateYet: 'Күнү коюла элек',
  untitledInvitation: 'Аталышы жок чакыруу',
  manage: 'Башкаруу',
  edit: 'Түзөтүү',
  open: 'Ачуу',
  share: 'Бөлүшүү',
  publishFirst: 'Конокторго жөнөтүү үчүн чакырууну жарыялаңыз',
  backToDashboard: '← Бардык чакыруулар',
};

export type DashboardDict = typeof ky;

const ru: DashboardDict = {
  dashboardTitle: 'Мои приглашения',
  dashboardEmpty: 'Пока нет приглашений. Создайте первое!',
  statusDraft: 'Черновик',
  statusPaid: 'Оплачено',
  statusPublished: 'Опубликовано',
  statComing: 'Придут',
  statPeople: 'Человек',
  statDeclined: 'Не придут',
  statNoAnswer: 'Нет ответа',
  noDateYet: 'Дата не указана',
  untitledInvitation: 'Приглашение без названия',
  manage: 'Управлять',
  edit: 'Редактировать',
  open: 'Открыть',
  share: 'Поделиться',
  publishFirst: 'Опубликуйте приглашение, чтобы отправить его гостям',
  backToDashboard: '← Все приглашения',
};

export const dashboardDict = { ky, ru };
