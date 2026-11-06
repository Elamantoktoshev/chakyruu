# Chakyruu.kg

Электрондук той чакыруулары — платформа электронных приглашений на тои (үйлөнүү той, кыз узатуу, бешик той, сүннөт той, маараке) для Кыргызстана.

Пользователь сам собирает приглашение в конструкторе (бесплатно), публикует его за 700 сом, рассылает гостям личные ссылки через WhatsApp и видит ответы и тилектер в кабинете.

## Стек

| Часть    | Технологии                                                        |
| -------- | ----------------------------------------------------------------- |
| `shared` | TypeScript, Zod — схемы, типы и чистая логика для клиента и сервера |
| `client` | React 19, Vite, TypeScript, Tailwind CSS v4, React Router 7       |
| `server` | Node.js 22, Express 5, TypeScript, Prisma 6, Zod, multer          |
| БД       | PostgreSQL 16 (локально — docker-compose, прод — DO Managed PG)   |

## Быстрый старт

Требуется Node.js ≥ 20 и Docker.

```bash
cp .env.example .env          # один .env на весь монорепо; заполните OTP_SECRET
npm install
docker compose up -d          # Postgres на localhost:5432
npx prisma migrate dev        # применить миграции (+ сгенерировать Prisma Client)
npm run seed                  # 10 шаблонов + демо «Айбек & Айзада» с гостями
npm run dev                   # shared (watch) + server :4000 + client :5173
```

- Лендинг: <http://localhost:5173/>
- Демо-приглашение: <http://localhost:5173/aibek-aizada>
- Кабинет: <http://localhost:5173/dashboard> — вход владельца демо по номеру `+996700000001`.
- В dev SMS не отправляются: код печатается в лог сервера строкой `[sms:dev] → +996… : … ваш код 123456`.
- Оплата в dev — заглушка (`FakePaymentProvider`): любая «оплата» сразу успешна.

## Скрипты (из корня)

| Команда                       | Что делает                                               |
| ----------------------------- | -------------------------------------------------------- |
| `npm run dev`                 | shared (tsc --watch) + server + client                   |
| `npm run seed`                | наполнить БД демо-данными (идемпотентно)                 |
| `npm run db:migrate`          | `prisma migrate dev`                                     |
| `npm run db:studio`           | Prisma Studio                                            |
| `npm run typecheck`           | сборка shared + проверка типов server и client           |
| `npm test`                    | все тесты: shared, server (unit + integration), client   |
| `npm run test:unit -w server` | только unit-тесты сервера (без БД)                       |
| `npm run build`               | production-сборка (shared → server → client)             |

Integration-тесты сервера работают в отдельной схеме Postgres `test` (та же БД из `.env`) и не трогают данные разработки.

## API

Формат ответа всегда `{ success, data, error }`. Все тела запросов проверяются zod-схемами из `@chakyruu/shared`; лишние поля отклоняются.

### Публичное (без входа)

| Метод | Путь | Описание |
| ----- | ---- | -------- |
| GET  | `/api/public/templates?type=` | Шаблоны, фильтр по типу тоя |
| GET  | `/api/public/invitations/:slug?g=<token>` | Приглашение. DRAFT видит только владелец (`isDraft: true`), остальным 404. С `g` — гость для обращения |
| POST | `/api/public/invitations/:slug/rsvp` | `{ token, attending, guestsCount }` или `{ name, attending, guestsCount }`; без токена создаётся гость и возвращается токен |
| GET  | `/api/public/invitations/:slug/tilekter?clientId=` | Видимые тилектер + `likedByMe` |
| POST | `/api/public/invitations/:slug/tilekter` | `{ token | authorName, text }` |
| POST | `/api/public/tilekter/:id/like` | `{ clientId }` — один лайк на браузер |
| POST | `/api/public/partner-leads` | Заявка тойканы `{ name, phone, venueName, city? }` |

### Авторизация

| Метод | Путь | Описание |
| ----- | ---- | -------- |
| POST | `/api/auth/request-code` | `{ phone }` (строго `+996XXXXXXXXX`) — SMS-код (5 мин) |
| POST | `/api/auth/verify` | `{ phone, code }` — вход; первый вход создаёт пользователя; httpOnly cookie `sid` |
| POST | `/api/auth/logout` | Удалить сессию |
| GET  | `/api/auth/me` | Текущий пользователь или 401 |

### Кабинет (`/api/my/*`, нужен вход; чужое приглашение → 403, несуществующее → 404)

| Метод | Путь | Описание |
| ----- | ---- | -------- |
| GET    | `/api/my/invitations` | Мои приглашения (+ организации для ORG_ADMIN) со статистикой |
| POST   | `/api/my/invitations` | `{ templateId }` — новый черновик |
| GET    | `/api/my/invitations/:id` | Данные для конструктора |
| PATCH  | `/api/my/invitations/:id` | Автосохранение (частичное). Пока DRAFT, slug следует за именами |
| POST   | `/api/my/invitations/:id/photo` | multipart `photo`: JPEG/PNG/WebP (по сигнатуре), ≤ 5 МБ |
| POST   | `/api/my/invitations/:id/publish` | `{ provider: MBANK | ODENGI | ELSOM }` — оплата 700 сом → PUBLISHED |
| GET    | `/api/my/invitations/:id/guests?status=` | Гости |
| POST   | `/api/my/invitations/:id/guests/bulk` | `{ text }` — одно имя на строку (`+996…` в конце строки — телефон) |
| DELETE | `/api/my/invitations/:id/guests/:guestId` | Удалить гостя |
| GET    | `/api/my/invitations/:id/tilekter` | Все тилектер, включая скрытые |
| PATCH  | `/api/my/invitations/:id/tilekter/:tilekId` | `{ hidden }` — скрыть/показать |

### Безопасность

- Сессия — случайный токен в httpOnly-cookie `sid` (`SameSite=Lax`, `Secure` в проде, 30 дней); в БД только sha256 токена.
- SMS-код хранится как HMAC с `OTP_SECRET` (≥ 32 символа), 5 попыток, новый код не чаще раза в 60 с и не больше 10 в сутки на номер, 3 запроса за 10 мин на номер.
- Изменяющие запросы с чужим `Origin` отклоняются (CSRF).
- Токен гостя — 128 бит; публичная страница не отдаёт токены и телефоны.
- Загрузки: тип по сигнатуре файла (SVG/HTML отклоняются), случайное имя, `X-Content-Type-Options: nosniff`.
- Slug не может совпасть с маршрутом приложения (`create`, `dashboard`, `login`, `pay`, `api`, `uploads`…).
- `TRUST_PROXY` — число reverse-proxy перед API; от него зависит IP в rate limit.
- С `NODE_ENV=production` сервер не стартует, пока нет реальных SMS- и платёжного провайдеров.

## Структура

```
shared/src       phone, slug (транслит), catalog (типы тоя, цена, треки), guests (разбор списка,
                 обращение, WhatsApp), tilek, summary, partners + схемы zod; тесты рядом
server
  prisma/        schema.prisma, seed.ts, migrations/
  src/auth/      OTP-вход, сессии, policy (owner / ORG_ADMIN / ADMIN), SmsProvider
  src/invitations/  публичная страница, конструктор (my.*), slug, доступ
  src/guests/    гости, персональные ссылки, RSVP
  src/tilek/     тилектер и лайки
  src/templates/ шаблоны
  src/partners/  заявки тойкан
  src/storage/   StorageProvider (local → DO Spaces), проверка изображений
  src/payments/  PaymentProvider (fake → MBank / O!Деньги / Элсом)
  test/          хелперы integration-тестов (app, db, globalSetup)
client/src
  pages/         Landing, Login, Create, Builder, Pay, Dashboard, DashboardInvitation, Invitation
  components/    invitation/ (InvitationView — один компонент для страницы, превью и карточек),
                 guests/, tilek/, dashboard/, landing/, AppHeader, PhoneFrame, TemplateCard
  builder/       форма конструктора, useAutosave
  rsvp/          useRsvp, хранение токена гостя
  i18n/          словари KY/RU по фичам; тест на совпадение ключей
```

## Модель данных

`Organization` → `User` (OWNER | ORG_ADMIN | ADMIN) → `Invitation` (по `Template`, тип тоя, DRAFT → PUBLISHED) → `Guest` (токен, INVITED | ATTENDING | DECLINED), `Tilek` → `TilekLike`, `Payment`. Отдельно `PartnerLead`, `OtpCode`, `Session`.
Суммы платежей хранятся в тыйынах (`Int`).

## TODO

- [ ] E2E Playwright после настройки CI (вход → конструктор → публикация → ответ гостя → кабинет).
- [ ] Реальная оплата: MBank / O!Деньги / Элсом через `PaymentProvider` (redirect + webhook) вместо `FakePaymentProvider`.
- [ ] Реальные SMS: Nikita.kg / SMSPro через `SmsProvider` вместо `ConsoleSmsProvider`.
- [ ] Хранилище фото в DigitalOcean Spaces через `StorageProvider`; ресайз фото перед сохранением.
- [ ] Музыка: положить 5 лицензионно чистых треков в `client/public/music/` (имена в `shared/src/catalog.ts`); пока файлов нет, плеер скрыт.
- [ ] Rate limit в памяти работает только на одном инстансе — перенести в Redis/Postgres при масштабировании.
- [ ] Периодическая очистка просроченных `OtpCode` и `Session`.
- [ ] Глобальный лимит SMS в час (защита бюджета при реальном провайдере).
- [ ] Защита от блокировки входа жертвы: злоумышленник может исчерпать лимит запросов кода на чужой номер.
- [ ] При ошибке `POST /auth/logout` клиент показывает выход, но сессия на сервере остаётся до истечения.
- [ ] Отправка уведомлений тойкане по новым `PartnerLead` (сейчас заявки только сохраняются в БД).
