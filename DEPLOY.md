# Запуск Chakyruu.kg на DigitalOcean

Пошаговая инструкция: от пустого аккаунта до работающего сайта на временном адресе `*.ondigitalocean.app`, затем подключение домена `chakyruu.kg`, откат и бэкапы.

Интерфейс DigitalOcean иногда меняется. Если кнопка называется чуть иначе, ищите по смыслу. Цены указаны на момент написания, проверьте их на сайте.

## Что получится

```
Гость / клиент ──https──▶ App Platform (сервис web: API + сайт)
                              │            │
                              │            └──▶ Managed PostgreSQL (данные, ежедневные бэкапы)
                              ├──▶ Spaces + CDN (фото, музыка) ◀── браузер грузит файлы напрямую
                              └──▶ Nikita.kg (SMS с кодом входа)
GitHub (push в main) ──▶ GitHub Actions: проверки → деплой в App Platform
```

Ориентировочная стоимость в месяц:

| Что | Цена |
|---|---|
| App Platform, сервис `apps-s-1vcpu-1gb` | ≈ $12 |
| Managed PostgreSQL, минимальный план | ≈ $15 |
| Spaces (250 ГБ + CDN) | $5 |
| **Итого** | **≈ $32** |

---

## 0. Что понадобится

- Аккаунт **GitHub**: код уже лежит в `Elamantoktoshev/chakyruu`.
- Аккаунт **DigitalOcean** с банковской картой.
- Договор с **Nikita.kg** (smspro.nikita.kg): логин, пароль и согласованное имя отправителя.
- Номер MBank, на который клиенты будут переводить оплату (режим `manual`).
- Необязательно: **Sentry** (ошибки) и **Umami Cloud** (статистика).
- На компьютере: `doctl`, консольная утилита DigitalOcean. Установка: `brew install doctl`.

## 1. Аккаунт DigitalOcean

1. Зарегистрируйтесь на cloud.digitalocean.com и подтвердите почту и карту.
2. **Settings → Security → Two-factor authentication** — включите 2FA. Без неё к деньгам и данным клиентов доступ защищён одним паролем.
3. Создайте проект: слева **Projects → New Project**, название `Chakyruu`.

## 2. База данных (Managed PostgreSQL)

1. **Create → Databases**.
2. Выберите **PostgreSQL**, версию **16**.
3. Регион: **Frankfurt (FRA1)**. В Центральной Азии у DigitalOcean регионов нет, Франкфурт ближе всего к Бишкеку.
4. План: самый маленький (Basic, 1 GB). Его можно увеличить позже без потери данных.
5. Имя кластера: **`chakyruu-db`**. Оно должно совпадать с `cluster_name` в `.do/app.yaml`.
6. Нажмите **Create Database Cluster** и подождите 5–10 минут.
7. На странице кластера откройте вкладку **Users & Databases**:
   - **Add new database** → `chakyruu`;
   - **Add new user** → `chakyruu`.
8. **Отдайте базу пользователю `chakyruu`.** Начиная с PostgreSQL 15 новый пользователь не может создавать таблицы в схеме `public`, и миграция падает с `permission denied for schema public`. Выполните один раз с компьютера, пока у базы нет Trusted Sources (сразу после создания, до шага 6):
   ```bash
   brew install libpq
   CLUSTER_ID=$(doctl databases list --format ID,Name --no-header | awk '$2=="chakyruu-db"{print $1}')
   # --show: без него doctl подставляет вместо пароля ******** и вход не проходит
   ADMIN_URI=$(doctl databases connection "$CLUSTER_ID" --show --format URI --no-header)
   /usr/local/opt/libpq/bin/psql "$(printf '%s' "$ADMIN_URI" | sed 's#/defaultdb?#/chakyruu?#')" -v ON_ERROR_STOP=1 \
     -c 'ALTER DATABASE chakyruu OWNER TO chakyruu' \
     -c 'ALTER SCHEMA public OWNER TO chakyruu'
   ```
   На Apple Silicon путь к `psql`: `/opt/homebrew/opt/libpq/bin/psql`. Если Trusted Sources уже включены, временно добавьте туда свой IP.

Перед продолжением проверьте на странице кластера: регион **FRA1**, версия **16**. Если что-то не так, удалите пустой кластер и создайте заново, пока в нём нет данных.

**Бэкапы.** У Managed PostgreSQL ежедневные бэкапы и восстановление на любой момент последних 7 дней включены автоматически. Найти их можно на вкладке **Backups** кластера. Отдельно включать ничего не нужно.

## 3. Хранилище файлов (Spaces)

1. **Create → Spaces Object Storage**.
2. Регион: **Frankfurt (FRA1)**.
3. **Enable CDN** — включите. Через CDN фото и музыка грузятся быстро.
4. **File listing**: **Restricted**. Тогда посторонний не сможет получить список всех файлов.
5. Имя: `chakyruu`. Имя должно быть уникальным во всём DigitalOcean. Если оно занято, выберите другое и поменяйте в `.do/app.yaml` значения:
   - `SPACES_BUCKET`;
   - `SPACES_CDN_URL`, в формате `https://<имя>.fra1.cdn.digitaloceanspaces.com`.
6. Ключи доступа: **API → Spaces Keys → Generate New Key**, назовите `chakyruu-app`. **Secret** показывается один раз, сохраните его в менеджер паролей.

## 4. SMS через Nikita.kg

1. В личном кабинете Nikita.kg согласуйте имя отправителя: до 11 латинских букв, цифр, точек и дефисов, например `Chakyruu`. Пока имя не одобрено, Nikita отвечает статусом 5.
2. **Обязательно спросите у Nikita.kg**, проверяют ли они IP-адрес отправителя. В их протоколе есть статус 3, «неверный IP источника».
   - Если проверяют, у App Platform исходящий IP по умолчанию не постоянный. Нужна платная опция DigitalOcean **Dedicated Egress IP**: в настройках приложения, раздел **Networking**. Её постоянный адрес передайте Nikita.
3. Проверьте ключи с вашего компьютера, ничего не отправляя и не тратя денег. В `.env` укажите:
   ```
   SMS_PROVIDER=nikita
   NIKITA_LOGIN=…
   NIKITA_PASSWORD=…
   NIKITA_SENDER=Chakyruu
   NIKITA_TEST_MODE=true
   ```
   Затем проверьте связку скриптом (ключи он не выводит, номер маскирует):
   ```
   npm run sms:test -- +996XXXXXXXXX
   ```
   В тестовом режиме ответ: «Request accepted by the gateway (status 11)». При ошибке скрипт печатает тип (`auth`, `funds`, `sender`, `stopwords`, `ip`, …) и что делать. Затем верните `NIKITA_TEST_MODE=false` и запустите скрипт ещё раз: придёт настоящее SMS `Chakyruu: кодуңуз 123456` (платно).

## 5. Подключить GitHub к DigitalOcean

DigitalOcean должен иметь доступ к репозиторию, чтобы забирать код.

1. **Create → Apps → GitHub → Install GitHub App**.
2. Разрешите доступ только к репозиторию `Elamantoktoshev/chakyruu`.
3. После того как репозиторий появится в списке, мастер создания можно закрыть: приложение создадим из готового описания.

## 6. Создать приложение из `.do/app.yaml`

```bash
doctl auth init          # вставьте API-токен: API → Tokens → Generate New Token (Read + Write)
doctl apps create --spec .do/app.yaml
doctl apps list          # запомните ID приложения (первая колонка)
```

В панели появится приложение **chakyruu** с сервисом `web`, задачей `migrate` и базой `db`.

## 7. Секреты

Откройте **Apps → chakyruu → Settings**. Переменные есть у компонента **web** и у задачи **migrate**. Для каждой переменной из таблицы ниже нажмите **Edit**, вставьте значение и отметьте **Encrypt**.

**Encrypt ставьте только у переменных из этой таблицы.** Остальные (`DATABASE_URL`, `CLIENT_URL`, `COMMIT_SHA`, `NODE_ENV` и т. д.) не трогайте: значения вида `${db.DATABASE_URL}` DigitalOcean подставляет только в незашифрованные переменные, а зашифрованные передаёт серверу буквально.

| Переменная | Где взять |
|---|---|
| `OTP_SECRET` | Сгенерируйте: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_PHONE` | Ваш номер `+996…`. Укажите его и в **web**, и в **migrate**: сид выдаст этому номеру роль админа |
| `NIKITA_LOGIN`, `NIKITA_PASSWORD`, `NIKITA_SENDER` | Из шага 4 |
| `SPACES_KEY`, `SPACES_SECRET` | Из шага 3 |
| `MANUAL_PAYMENT_RECEIVER` | Номер MBank для переводов, `+996…` |
| `TEST_LOGIN_PHONES` | Необязательно, демо-номера: `+996555000001:123456`. Номер админа сюда ставить нельзя |
| `SENTRY_DSN` | Необязательно, см. раздел 13 |
| `UMAMI_WEBSITE_ID` | Необязательно, см. раздел 13 |

Если какой-то переменной не хватает, сервер не запустится. В **Runtime Logs** он напишет список всех проблем сразу, например `OTP_SECRET: must be a random string of at least 32 characters`.

## 8. Первый деплой

1. **Apps → chakyruu → Create Deployment** (или кнопка **Deploy**).
2. На вкладке **Activity** видно, как идут шаги:
   - **Build**: сборка Docker-образа, 3–6 минут;
   - **Pre-deploy job `migrate`**: создание таблиц, затем шаблоны и роль админа. Демо-данные в production не создаются;
   - **Deploy**: запуск сервиса.
3. Проверка: откройте `https://<ваше-приложение>.ondigitalocean.app/api/health`. Должно быть:
   ```json
   {"success":true,"data":{"status":"ok","database":"ok","commit":"<хэш коммита>"},"error":null}
   ```
   Если пришло `"database":"unavailable"`, проверьте базу: **Databases → chakyruu-db → Settings → Trusted Sources**. Там должно быть приложение `chakyruu` (оно добавляется само). Если его нет, добавьте вручную.
4. Откройте главную страницу и войдите по своему номеру: SMS придёт от Nikita. В `/admin` должна быть вкладка «Статистика».

## 9. Автоматический деплой из GitHub

Сейчас при push в `main` GitHub Actions запускает проверки и сборку образа, а деплой пропускает. Чтобы он заработал:

1. Создайте токен DigitalOcean: **API → Tokens → Generate New Token**, имя `github-deploy`, права **Read + Write**.
2. На GitHub откройте репозиторий → **Settings → Secrets and variables → Actions**:
   - вкладка **Secrets → New repository secret**: `DIGITALOCEAN_ACCESS_TOKEN` = токен;
   - вкладка **Variables → New repository variable**: `DO_APP_ID` = ID из `doctl apps list`.
3. Следующий push в `main` пройдёт проверки и сам выкатит новую версию.

Деплой из GitHub выкатывает новый код со **старыми настройками** приложения, поэтому секреты из панели не стираются. Если вы поменяли `.do/app.yaml` (новая переменная, другой размер сервера), примените изменения вручную:
```bash
doctl apps update <DO_APP_ID> --spec .do/app.yaml
```
**Внимание:** эта команда заменяет переменные целиком. Секреты без значения в файле придётся ввести заново, как в шаге 7.

## 10. Подключить домен chakyruu.kg

1. **Apps → chakyruu → Settings → Domains → Add Domain**.
2. Добавьте `chakyruu.kg`, затем `www.chakyruu.kg`.
3. DigitalOcean предложит два варианта.
   - **Рекомендуется: «We manage your domain».** У регистратора `.kg` (в панели, где вы покупали домен) замените NS-серверы на:
     ```
     ns1.digitalocean.com
     ns2.digitalocean.com
     ns3.digitalocean.com
     ```
     Все DNS-записи DigitalOcean создаст сам.
   - **«You manage your domain»** — записи остаются у регистратора:
     - `www` → **CNAME** на адрес приложения `<ваше-приложение>.ondigitalocean.app.`;
     - для `chakyruu.kg` без `www` CNAME запрещён. Если регистратор поддерживает **ALIAS/ANAME**, укажите тот же адрес. Если нет, настройте у регистратора переадресацию `chakyruu.kg` → `https://www.chakyruu.kg`.
4. Изменения DNS расходятся от нескольких минут до 24–48 часов. HTTPS-сертификат DigitalOcean выпустит сам.
5. Сделайте `chakyruu.kg` основным доменом (**Primary**). Переменная `CLIENT_URL=${APP_URL}` подхватит новый адрес при следующем деплое: ссылки в приглашениях, QR и превью станут `https://chakyruu.kg/…`.
6. После переезда:
   - пользователям нужно будет войти заново: cookie входа привязана к адресу;
   - старые ссылки `*.ondigitalocean.app` продолжат работать, но в приглашениях будет новый адрес;
   - в Umami и Sentry укажите новый домен (если подключены).

## 11. Откат

**Код.** **Apps → chakyruu → Activity** → выберите предыдущий успешный деплой → **Rollback**. Через 1–2 минуты работает прошлая версия.

**База при откате кода не откатывается.** Если в новой версии была миграция, удаляющая или переименовывающая данные, старый код может с ней не работать. Тогда:
- восстановите базу из бэкапа (раздел 12);
- или исправьте ошибку и выкатите новую версию.

Миграции пишите так, чтобы они только добавляли поля и таблицы.

## 12. Бэкапы и восстановление

**Автоматические.** Ежедневные бэкапы и восстановление на момент времени за 7 дней (**Databases → chakyruu-db → Backups**). Восстановление создаёт **новый** кластер. После него:
1. в `.do/app.yaml` поменяйте `cluster_name` на имя нового кластера;
2. выполните `doctl apps update`;
3. запустите деплой.

**Ручной дамп в Spaces**, например перед крупным изменением:
1. установите клиент PostgreSQL 16: `brew install postgresql@16`;
2. временно добавьте свой IP в **Trusted Sources** базы;
3. возьмите строку подключения: **Databases → chakyruu-db → Connection Details → Connection string**;
4. выполните:
   ```bash
   DATABASE_URL="<строка подключения>" SPACES_KEY=… SPACES_SECRET=… SPACES_BUCKET=chakyruu SPACES_REGION=fra1 \
     npm run db:dump -w server
   ```
   Дамп сохраняется приватным файлом `backups/chakyruu-<дата>.dump` в Spaces и по ссылке недоступен.
5. Восстановление из такого дампа:
   ```bash
   pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" chakyruu-<дата>.dump
   ```
6. Старые дампы удаляйте вручную в панели Spaces.

## 13. Наблюдаемость (необязательно, но полезно)

- **Логи:** **Apps → chakyruu → Runtime Logs**. Каждая строка — JSON, у каждого запроса есть `reqId`. Тот же номер приходит в ответе в заголовке `X-Request-Id`, по нему находится нужная строка лога. Номера телефонов, коды и токены гостей в логах скрыты.
- **Sentry** (ошибки):
  1. на sentry.io создайте проект **Node.js**, при желании второй — **React**;
  2. DSN проекта вставьте в `SENTRY_DSN`; для браузерного проекта — в `SENTRY_DSN_CLIENT`, это необязательно;
  3. проверка: откройте сайт, в консоли браузера выполните `setTimeout(() => { throw new Error('sentry test') })`, и ошибка появится в Sentry.
- **Umami Cloud** (статистика без cookie, баннер не нужен):
  1. на umami.is добавьте сайт, его ID вставьте в `UMAMI_WEBSITE_ID`;
  2. события: `create_started`, `published`, `guest_opened`, `guest_rsvp`, `partner_lead`. Адреса приглашений и токены гостей в статистику не попадают.
- **Статистика бизнеса:** `/admin` → «Статистика»: пользователи, приглашения, выручка, конверсия за сутки, неделю и месяц.

## 14. Перенос старых файлов в Spaces

Нужен, только если сайт уже работал с `STORAGE_PROVIDER=local` и в базе есть фото с адресами `/uploads/…`. Свежему запуску он не нужен.
```bash
npm run uploads:to-spaces -w server -- --dry-run   # покажет, что будет сделано
npm run uploads:to-spaces -w server                # загрузит файлы и поменяет адреса в базе
```

## 15. Если что-то пошло не так

| Симптом | Причина и решение |
|---|---|
| Сервис не стартует, в логе `Invalid environment` | Не хватает переменных или они в неверном формате: в логе список. Шаг 7 |
| `/api/health` → `database: unavailable` | Trusted Sources базы (шаг 8.3), или кластер ещё создаётся |
| Вход: «Код жөнөтүлгөн жок» | В логе `[sms] delivery failed … <kind> — <подсказка>`: `auth` (2, логин/пароль), `ip` (3, шаг 4.2), `funds` (4, баланс), `sender` (5, имя отправителя), `stopwords` (6). Проверка: `npm run sms:test -- +996…` |
| Вход: «Login is temporarily unavailable» | Достигнут `SMS_DAILY_LIMIT` (500 SMS в сутки). Проверьте, нет ли атаки, и при необходимости поднимите лимит |
| Фото не показываются | Верны ли `SPACES_CDN_URL` и `SPACES_BUCKET` (CDN должен быть включён). В консоли браузера не должно быть ошибок CSP |
| Превью в WhatsApp не обновилось | WhatsApp кэширует превью. После правки приглашения адрес картинки меняется сам, но уже отправленные сообщения сохраняют старое превью |

**Масштабирование.** Сервис рассчитан на **один** экземпляр: лимиты запросов хранятся в памяти. Перед увеличением `instance_count` нужно вынести их в Redis.
