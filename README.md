# Chakyruu.kg

Электрондук той чакыруулары — платформа электронных приглашений на тои (үйлөнүү той, бешик той, сүннөт той, маараке) для Кыргызстана.

## Стек

| Часть    | Технологии                                                        |
| -------- | ----------------------------------------------------------------- |
| `client` | React 19, Vite, TypeScript, Tailwind CSS v4, React Router 7       |
| `server` | Node.js 22, Express 5, TypeScript, Prisma 6, Zod                  |
| БД       | PostgreSQL 16 (локально — docker-compose, прод — DO Managed PG)   |

## Быстрый старт

Требуется Node.js ≥ 20 и Docker.

```bash
cp .env.example .env          # один .env на весь монорепо
npm install
docker compose up -d          # Postgres на localhost:5432
npx prisma migrate dev        # применить миграции (+ сгенерировать Prisma Client)
npm run seed                  # 4 шаблона + демо «Айбек & Айзада»
npm run dev                   # server :4000 + client :5173
```

Откройте демо: <http://localhost:5173/aibek-aizada>
Список гостей: <http://localhost:5173/aibek-aizada/guests>

## Скрипты (из корня)

| Команда              | Что делает                                         |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | client + server одновременно (concurrently)        |
| `npm run seed`       | наполнить БД тестовыми данными (идемпотентно)      |
| `npm run db:migrate` | `prisma migrate dev`                               |
| `npm run db:studio`  | Prisma Studio                                      |
| `npm run typecheck`  | проверка типов в обоих пакетах                     |
| `npm test -w server` | unit-тесты сервера (vitest)                        |
| `npm run build`      | production-сборка                                  |

Prisma CLI запускается из корня: путь к схеме задан в `package.json` → `prisma.schema`, а `.env` берётся из корня.

## API

Формат ответа всегда `{ success, data, error }`.

| Метод | Путь                              | Описание                                    |
| ----- | --------------------------------- | ------------------------------------------- |
| GET   | `/api/invitations/:slug`          | Публичные данные приглашения (PUBLISHED)    |
| POST  | `/api/invitations/:slug/rsvp`     | Ответ гостя `{ guestName, attending, guestsCount?, comment? }` |
| GET   | `/api/invitations/:slug/rsvps`    | Ответы + итог. **TODO: авторизация**        |

## Структура

```
client/src
  api/          fetch-клиент, типы, useAsync
  i18n/         словари KY/RU + LanguageProvider
  components/   Ornament, Countdown, RsvpForm, LanguageSwitch, StatusView
  pages/        InvitationPage (/:slug), GuestsPage (/:slug/guests)
server
  prisma/       schema.prisma, seed.ts, migrations/
  src/lib/      prisma, http (envelope + ошибки), rateLimit
  src/invitations/  schemas (zod), service, routes, summary + тесты
```

## Модель данных

`Organization` (тойкана/агентство) → `User` (OWNER | ORG_ADMIN | ADMIN) → `Invitation` (по `Template`) → `Rsvp`, `Payment` (MBANK | ODENGI | ELSOM).
`organizationId` у пользователя и приглашения необязателен — задел под multi-tenant для тойкана-партнёров.
Суммы платежей хранятся в тыйынах (`Int`).
