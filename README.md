# Chakyruu.kg

Электрондук той чакыруулары — платформа электронных приглашений на тои (үйлөнүү той, кыз узатуу, бешик той, сүннөт той, маараке) для Кыргызстана.

Пользователь сам собирает приглашение в конструкторе (бесплатно), публикует его за 499 сом, рассылает гостям личные ссылки через WhatsApp и видит ответы и тилектер в кабинете.

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
- Вход без SMS в dev: `DEV_LOGIN_WITHOUT_SMS=true` — достаточно ввести номер (в проде сервер с этим флагом не стартует).
- Оплата в dev — `PAYMENT_PROVIDER=fake`: любая «оплата» сразу успешна.
- Партнёры из seed: тойкана «Ала-Тоо» — `+996700000010`, тамада «Нурбек» — `+996700000020` (кабинет `/partner`), супер-админ — номер из `ADMIN_PHONE` (`/admin`).

## Партнёры (B2B)

- **Типы:** `VENUE` (тойкана: адрес, 2ГИС, залы), `TAMADA` (профиль, языки, цена «от», видео, занятые даты), `AGENCY` (общий профиль, покупает пакеты по ценам тойкан).
- **Кабинет `/partner`** доступен пользователю с ролью `ORG_ADMIN`. Организация всегда берётся из сессии: адресовать чужую нельзя.
- **Кредиты:** `Organization.invitationCredits` — баланс, `CreditTransaction` — журнал (покупка, подарок, возврат, начисление админом). Пакеты 10 / 30 / 100 покупаются в «Кредитах».
- **Каталог `/tamadalar`:** только опубликованные админом тамады, фильтры по городу, языку, цене и свободной дате (свободен = не отмечен занятым и не стоит на другом опубликованном приглашении). WhatsApp тамады наружу не отдаётся — «Жазуу» идёт через `/api/public/tamadas/:id/contact`, который считает клик и перенаправляет на `wa.me`.

### Как работает подарок от партнёра

1. Партнёр в «Белектер» вводит номер клиента `+996…`, дату тоя и (для тойканы) зал. **1 кредит резервируется сразу**, создаётся одноразовый код вида `K7MQ-3XPA`. Кодом можно поделиться в WhatsApp.
2. Клиент входит **с этим же номером** — в кабинете появляется «Сизге белек бар!» → «Пайдалануу» → выбор шаблона. Тойкана, адрес, 2ГИС, дата и зал подставляются сами.
3. Публикация такого приглашения бесплатна, код помечается использованным. Использовать код повторно, с другого номера, после отмены или после срока (дата тоя + 30 дней) нельзя.
4. Неиспользованный подарок партнёр может отменить — кредит вернётся. Просроченные подарки возвращают кредит автоматически.
5. На приглашении появляются блоки «Той өтүүчү жай» (тойкана) и «Тамада» с кнопкой «Тамадага жазуу». Партнёр **не получает доступа** к гостям клиента — только сводную статистику (сколько приглашений, сколько людей, клики, календарь тоев).

### Как стать ADMIN

Укажите свой номер в `.env` → `ADMIN_PHONE=+996XXXXXXXXX` и выполните `npm run seed` — пользователь с этим номером получит роль `ADMIN` (повторный запуск безопасен). Дальше войдите по номеру и откройте `/admin`: заявки (создание организации из заявки делает номер из заявки её `ORG_ADMIN`), организации и начисление кредитов, модерация каталога, ручное подтверждение платежей, цены.

## Платежи

| `PAYMENT_PROVIDER` | Что делает | Прод |
| --- | --- | --- |
| `fake` | Оплата сразу успешна (dev) | нет |
| `manual` | Клиент переводит на MBank `MANUAL_PAYMENT_RECEIVER` с кодом `CH-XXXXX` в комментарии, админ подтверждает в `/admin` → «Төлөмдөр» | **да** (старт) |
| `mbank`, `odengi`, `elsom` | Каркасы `server/src/payments/*.gateway.ts`: создание платежа, проверка подписи webhook и статус помечены `TODO` и пока явно падают | нет, пока не реализованы |

- Все цены — в таблице `Price` (редактируются в `/admin` → «Баалар»), суммы платежей хранятся в тыйынах.
- Проведение платежа — одна функция `fulfillPayment`: срабатывает только переход `PENDING → SUCCEEDED`, поэтому повторные/параллельные webhook, опрос статуса и ручное подтверждение безопасны.
- Webhook: `POST /api/payments/webhook/:gateway`, подпись проверяется по сырому телу; неверная подпись → 401 и ничего не меняется. Идентификатор — `(gateway, externalId)`.

**Что запросить у провайдеров при подключении** (имена переменных предварительные — уточнить по документации мерчанта):

| Провайдер | Переменные | Что нужно от провайдера |
| --- | --- | --- |
| MBank | `MBANK_MERCHANT_ID`, `MBANK_SECRET_KEY`, `MBANK_API_URL` | ID мерчанта, ключ подписи запросов и webhook, адрес API (тест/прод), формат webhook и статусов, URL возврата |
| O!Деньги | `ODENGI_MERCHANT_ID`, `ODENGI_SECRET_KEY`, `ODENGI_API_URL` | то же + способ получения QR / ссылки на оплату |
| Элсом | `ELSOM_MERCHANT_ID`, `ELSOM_SECRET_KEY`, `ELSOM_API_URL` | то же |

Webhook-адрес для провайдера: `https://<домен>/api/payments/webhook/<mbank|odengi|elsom>`, возврат клиента: `https://<домен>/pay/result/<paymentId>` (`PUBLIC_APP_URL`).

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
| POST | `/api/public/partner-leads` | Заявка партнёра `{ type: VENUE\|TAMADA\|AGENCY, name, phone, venueName, city? }` |
| GET  | `/api/public/prices` | Активные цены |
| GET  | `/api/public/tracks` | Включённые треки музыки (с файлом) |
| GET  | `/api/public/invitations/:slug/calendar.ics` | «Календарга кошуу» (только опубликованные) |
| GET  | `/api/og/:slug.png` | Превью ссылки 1200×630 (satori + resvg, кэш в памяти), только PUBLISHED |
| GET  | `/api/og/:slug/story.png` | Картинка для Stories 1080×1920 с QR-кодом (скачивание) |
| GET  | `/api/og/:slug/qr.png` | QR-код ссылки для печати |
| GET  | `/api/public/tamadas?city=&lang=&priceMax=&date=` | Каталог тамад |
| GET  | `/api/public/venues?city=` | Опубликованные тойканы (для конструктора) |
| GET  | `/api/public/tamadas/:id/contact?invitation=` | Клик «Тамадага жазуу» → 302 на WhatsApp |
| POST | `/api/payments/webhook/:gateway` | Webhook платёжного провайдера (подпись обязательна) |

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
| POST   | `/api/my/invitations/:id/photo` | multipart `photo`: JPEG/PNG/WebP (по сигнатуре), ≤ 10 МБ → webp ≤ 1600 px без EXIF |
| POST   | `/api/my/invitations/:id/gallery` | Фото в галерею (до 6, та же обработка) |
| PUT    | `/api/my/invitations/:id/gallery/order` | `{ photoIds }` — новый порядок |
| DELETE | `/api/my/invitations/:id/gallery/:photoId` | Удалить фото вместе с файлом |
| POST   | `/api/my/invitations/:id/music` | multipart `music` (+ `durationSec`): свой mp3 ≤ 10 МБ (по сигнатуре), сжатие ffmpeg до 128 kbps |
| DELETE | `/api/my/invitations/:id/music` | Удалить свой mp3 |
| POST   | `/api/my/invitations/:id/publish` | `{ provider: MBANK | ODENGI | ELSOM }` — оплата 499 сом (цена из таблицы Price) → PUBLISHED |
| GET    | `/api/my/invitations/:id/guests?status=` | Гости |
| POST   | `/api/my/invitations/:id/guests/bulk` | `{ text }` — одно имя на строку (`+996…` в конце строки — телефон) |
| DELETE | `/api/my/invitations/:id/guests/:guestId` | Удалить гостя |
| GET    | `/api/my/invitations/:id/tilekter` | Все тилектер, включая скрытые |
| PATCH  | `/api/my/invitations/:id/tilekter/:tilekId` | `{ hidden }` — скрыть/показать |
| GET    | `/api/my/gifts` | Подарки партнёров на мой номер |
| GET    | `/api/my/payments/:id` | Статус платежа (плательщику) |

Автосохранение принимает `musicTrackId` (только включённый трек; выбор трека удаляет свой mp3) и `musicStartSec` (0–600).
`POST /api/my/invitations` принимает `giftCode`; автосохранение принимает `venueOrgId`, `tamadaOrgId`, `hallId` (только опубликованные партнёры или партнёр из подарка).

### Партнёр (`/api/partner/*`, роль ORG_ADMIN, иначе 403)

`GET/PATCH /profile`, `POST /logo`, `POST/PATCH/DELETE /halls` (VENUE), `PATCH /tamada`, `POST /tamada/photo`, `PUT/DELETE /busy-dates/:date` (TAMADA), `GET /credits`, `POST /credits/purchase { priceCode, provider }`, `GET /stats`, `GET/POST /gifts`, `POST /gifts/:id/cancel`.

### Админ (`/api/admin/*`, роль ADMIN, иначе 403)

`GET/POST /tracks`, `PATCH /tracks/:id { title, category, active, sortOrder, durationSec }`, `POST /tracks/:id/file` (mp3 ≤ 20 МБ), `GET /organizations?type=`, `PATCH /organizations/:id { catalogStatus }`, `POST /organizations/:id/credits { amount }`, `GET /leads?status=`, `PATCH /leads/:id { status }`, `POST /leads/:id/convert`, `GET /prices`, `PATCH /prices/:code`, `GET /payments?status=`, `POST /payments/:id/confirm`.

Шаблоны: `GET /api/admin/templates` (все, с картинками иллюстрированных), `PATCH /api/admin/templates/:id` (название, вид тоя, цена `priceSom` или `null` = общая, бейдж `HIT`/`NEW`/`null`, порядок, `isActive`, описание KY/RU), `POST /api/admin/templates/:id/assets?file=layers/hand-left.webp` (multipart `image`), `DELETE …/assets?file=…` (вернуть файл из репозитория). Страница — `/admin/templates`.

### Безопасность

- Сессия — случайный токен в httpOnly-cookie `sid` (`SameSite=Lax`, `Secure` в проде, 30 дней); в БД только sha256 токена.
- SMS-код хранится как HMAC с `OTP_SECRET` (≥ 32 символа), 5 попыток, новый код не чаще раза в 60 с и не больше 10 в сутки на номер, 3 запроса за 10 мин на номер.
- Изменяющие запросы с чужим `Origin` отклоняются (CSRF).
- Токен гостя — 128 бит; публичная страница не отдаёт токены и телефоны.
- Загрузки: тип по сигнатуре файла (SVG/HTML отклоняются, mp3 — по ID3/кадру MPEG), случайное имя, `X-Content-Type-Options: nosniff`. Фото перекодируются sharp в webp, EXIF (в т.ч. GPS) удаляется, лимит 50 Мп против «бомб распаковки».
- OG-теги `/:slug` экранируются; токен гостя в HTML не попадает; черновики не раскрываются. Приглашения — `noindex`.
- Slug не может совпасть с маршрутом приложения (`create`, `dashboard`, `login`, `pay`, `api`, `uploads`…).
- `TRUST_PROXY` — число reverse-proxy перед API; от него зависит IP в rate limit.
- С `NODE_ENV=production` сервер не стартует без https-адреса, Nikita.kg, Spaces и реального платёжного режима.
- helmet + CSP (свой домен и CDN Spaces), очистка текста от управляющих и bidi-символов, лимиты на все публичные POST и на загрузки (на пользователя), IP клиента из `do-connecting-ip`.
- Вход: ловушка для ботов, минимальное время заполнения формы, суточный лимит SMS на весь сайт (`SMS_DAILY_LIMIT`).
- Логи (pino, JSON) с `requestId`; телефоны, коды, cookie и токены гостей скрыты. Sentry и Umami — только при заданных ключах.

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

## Музыка, галерея, превью ссылок

- **Музыка.** Таблица `Track` (категории ULUTTUK / ZAMANBAP / BALDARGA / KLASSIKA). Файл трека — либо `/music/имя.mp3` из `client/public/music/`, либо загруженный в админке. Трек виден в конструкторе, только когда он включён и у него есть файл; выключенный трек перестаёт играть во всех приглашениях. Плеер — пластинка, громкость нарастает за 2 с (на iPhone Safari громкость из кода не меняется — там сразу полная), старт с `musicStartSec`.
- **Галерея.** До 6 фото, лента со свайпом на CSS scroll-snap.
- **OG-превью.** В production API отдаёт и собранный клиент (`client/dist`, или `CLIENT_DIST_DIR`): для опубликованного `/:slug` в HTML подставляются OG-теги, на личной ссылке — «Урматтуу Асан байке, сизди тойго чакырабыз!». В dev Vite отдаёт клиент сам, поэтому OG проверяется так: `npm run build -w client`, затем `curl localhost:4000/<slug>`.
- **Шрифты.** В Playfair Display нет букв ң ө ү — они берутся из Playfair 2 (`client/src/styles/kyrgyz-serif.css`, грузится только при наличии этих букв); в OG-картинках так же.

## Иллюстрированные шаблоны

Каталог `/templates` показывает два вида шаблонов:

- **нарисованные в коде** (`client/src/templates/<key>/`): Классика, Ала-Тоо, Шырдак и т. д.; картинки не нужны;
- **иллюстрированные**: один общий компонент `illustrated`, внешний вид задаёт манифест в `Template.config` (схема — `shared/src/manifest.ts`), а картинки лежат в `client/public/templates/<slug>/` или загружаются в `/admin/templates`. Загруженное в админке важнее файлов из репозитория. Пока файла нет нигде, на его месте показывается плейсхолдер в цветах шаблона с подписью слоя — всё работает до появления арта.

Заготовки 12 шаблонов — `server/prisma/seed.illustrated.ts`. Код задаёт палитру, тип анимации и теги; название, вид тоя, порядок, цену, бейдж, вкл/выкл, описание и загруженные картинки меняет админка — деплой их не затирает.

### Какие файлы нарисовать

Все файлы — **WebP** (PNG/JPEG тоже можно загрузить в админке: они перекодируются в WebP), до 10 МБ. «Прозрачный» = вырезанный объект на прозрачном фоне (PNG/WebP с альфа-каналом); админка не примет такой слой без прозрачности. Обложка проверяется на пропорции 9:16.

**У каждого шаблона:**

| Файл | Размер | Прозрачность | Что это |
|---|---|---|---|
| `cover.webp` | 1080×1920 (9:16) | нет | обложка: телефон в каталоге, верх приглашения, закрытая сцена с именем гостя |
| `bg.webp` | 1080×1920 или больше | нет | фон страницы под текстом (показывается сквозь светлую вуаль) |

**Плюс слои анимации открытия** (тип — `opening.kind` в манифесте):

| Анимация | Файлы | Размер (ширина) | Прозрачность |
|---|---|---|---|
| `hands` — руки подают конверт, печать ломается, карточка выезжает | `layers/backdrop.webp` | 1080×1920 | нет |
| | `envelope.webp` | ~1300 px | да |
| | `layers/hand-left.webp`, `layers/hand-right.webp` | ~900 px | да |
| | `seal.webp` (сургучная печать) | ~400×400 | да |
| `branches` — ветки расходятся, открывая сад; летит бабочка | `layers/branch-left.webp`, `layers/branch-right.webp` | ~1200 px | да |
| | `layers/butterfly.webp` | ~300 px | да |
| `cloche` — серебряная крышка поднимается с подноса | `layers/backdrop.webp` | 1080×1920 | нет |
| | `layers/tray.webp` (поднос) | ~1500 px | да |
| | `layers/cloche.webp` (крышка) | ~1300 px | да |
| `carpet` — ковёр / шырдак разворачивается | `layers/carpet.webp` | 1080×1920 | да (бахрома по краям) |
| | `layers/roll.webp` (скатка) | ~1150 px | да |
| | `layers/medallion.webp` (ою в центре) | ~800 px | да |
| `portrait` — портрет проявляется, вокруг вырастает рамка-орнамент | `layers/frame.webp` | 1080×1920 | да (пустая середина) |
| | `layers/sparkles.webp` (блёстки) | 1080×1920 | да |
| `boz-uy`, `envelope`, `curtains`, `tunduk` | — | — | сцены нарисованы в коде, нужны только `cover.webp` и `bg.webp` |

Во всех сценах, кроме `cloche`/`carpet`/`hands`, роль основной картинки играет `cover.webp` (сад в `branches`, портрет в `portrait`); в `hands` и `cloche` он же — выезжающая карточка-приглашение.

**12 заготовок:**

| Шаблон | Папка (`client/public/templates/…`) | Анимация |
|---|---|---|
| Арча бакчасы | `archa-bakchasy/` | branches |
| Ак калпак | `ak-kalpak/` | hands |
| Дасторкон | `dastorkon/` | cloche |
| Эки жүрөк | `eki-zhurok/` | portrait |
| Ысык-Көл түнү | `ysyk-kol-tunu/` | tunduk |
| Анар бакчасы | `anar-bakchasy/` | branches |
| Кызыл кийиз | `kyzyl-kiyiz/` | carpet |
| Тушкийиз | `tushkiyiz/` | carpet |
| Элечек | `elechek/` | portrait |
| Жайлоодогу боз үй | `zhailoo-boz-uy/` | boz-uy |
| Жибек жол | `zhibek-zhol/` | envelope |
| Алтын той | `altyn-toy/` | envelope |

Положили файлы в репозиторий — они появятся после деплоя. Загрузили в `/admin/templates` — сразу, с размытым превью на время загрузки.

**Права на арт.** Используйте только свои или купленные с лицензией иллюстрации (сток, ИИ-генерация с коммерческой лицензией, иллюстратор). Картинки с сайтов других сервисов приглашений брать нельзя.

## Модель данных

`Organization` (VENUE | TAMADA | AGENCY, кредиты, `Hall`, `TamadaProfile`, `TamadaBusyDate`, `CreditTransaction`, `GiftCode`, `TamadaClick`) → `User` (OWNER | ORG_ADMIN | ADMIN) → `Invitation` (по `Template`, тип тоя, DRAFT → PUBLISHED, `venueOrgId` / `tamadaOrgId` / `hallId` — только брендинг) → `Guest` (токен, INVITED | ATTENDING | DECLINED), `Tilek` → `TilekLike`, `InvitationPhoto` (галерея), `Track` (музыка), `Payment` (INVITATION | CREDIT_PACKAGE). Отдельно `Price`, `PartnerLead`, `OtpCode`, `Session`.
Суммы платежей хранятся в тыйынах (`Int`).

## Продакшен

- **[DEPLOY.md](DEPLOY.md)** — запуск на DigitalOcean по шагам: база, Spaces, Nikita.kg, секреты, первый деплой, автодеплой из GitHub, домен chakyruu.kg, откат, бэкапы.
- **[LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md)** — что проверить руками перед первыми клиентами.
- Один сервис: API отдаёт и собранный сайт (`client/dist`); `.do/app.yaml`, `server/Dockerfile`, `.github/workflows/ci.yml`.
- Все переменные окружения проверяются при старте (`server/src/config/env.ts`), описание — в `.env.example`.

| Команда (из `server/`) | Что делает |
| --- | --- |
| `npm run release` | Миграции, затем справочники: это и запускает задача PRE_DEPLOY `migrate` |
| `npm run migrate:deploy` | Только применить миграции |
| `npm run seed:prod` | Справочники без демо-данных |
| `npm run sms:test -- +996…` | Отправить тестовый код через Nikita.kg (из корня) |
| `npm run telegram:test` | Узнать chat id и проверить Telegram-уведомления (из корня) |
| `npm run uploads:to-spaces -- --dry-run` | Перенести `server/uploads` в Spaces |
| `npm run db:dump` | Ручной дамп базы в Spaces (`backups/`) |
| `npm run brand:render` | Пересоздать иконки PWA и OG-картинку главной |

## TODO

- [ ] E2E Playwright (CI уже настроен): вход → конструктор → публикация → ответ гостя → кабинет.
- [ ] SSR / пререндер, если PageSpeed Insights после деплоя покажет < 85 (локально 60–78, LCP ≈ 4,3 с).
- [ ] Заполнить `[ЗАПОЛНИТЬ: …]` в `client/src/legal/*` и проверить тексты у юриста.
- [ ] Реальная оплата: реализовать `MBankGateway` / `ODengiGateway` / `ElsomGateway` (создание платежа, проверка подписи webhook, статус) и добавить их в `PRODUCTION_READY` в `payments/registry.ts`. До этого в проде — `PAYMENT_PROVIDER=manual`.
- [ ] Возвраты платежей (`REFUNDED`) и отмена пакета.
- [ ] Автоматически помечать FAILED брошенные `PENDING`-платежи (manual) старше N дней, чтобы не копились в `/admin`.
- [ ] Маркетплейс тамад: бронирование даты через Chakyruu, отзывы.
- [ ] Музыка: добавить лицензионно чистые файлы — положить в `client/public/music/` или загрузить в `/admin` → «Музыка», затем включить трек. Пять треков из миграции `music_tracks` выключены, пока нет файлов.
- [ ] Удаление приглашения: сейчас его нет; при появлении — удалять файлы галереи и музыки из хранилища.
- [ ] Rate limit в памяти работает только на одном инстансе — перенести в Redis/Postgres при масштабировании.
- [ ] Периодическая очистка просроченных `OtpCode` и `Session`.
- [ ] Защита от блокировки входа жертвы: злоумышленник может исчерпать лимит запросов кода на чужой номер.
- [ ] При ошибке `POST /auth/logout` клиент показывает выход, но сессия на сервере остаётся до истечения.
- [ ] Отправка уведомлений тойкане по новым `PartnerLead` (сейчас заявки только сохраняются в БД).
