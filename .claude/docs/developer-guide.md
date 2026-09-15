# Гайд для разработчиков

## Быстрый старт

```bash
pnpm install                # зависимости НЕ ставятся автоматически после клонирования
cp .env.example .env        # используется и docker-compose, и Prisma
pnpm db:up                  # требует запущенный Docker Desktop
pnpm db:generate             # ОБЯЗАТЕЛЬНО после клонирования — сгенерированный клиент в .gitignore
pnpm dev                    # web :3000, backend :3001
```

Frontend на `http://localhost:3000`, backend API на `http://localhost:3001/api`, Swagger UI на
`http://localhost:3001/docs`.

## Переменные окружения (`.env.example`, корень репозитория)

```
POSTGRES_USER=expense
POSTGRES_PASSWORD=expense
POSTGRES_DB=expense_tracker
POSTGRES_PORT=5432
DATABASE_URL="postgresql://expense:expense@localhost:5432/expense_tracker?schema=public"
PORT=3001
CORS_ORIGIN=http://localhost:3000
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> `JWT_REFRESH_SECRET` объявлен в `.env` и в allowlist `turbo.json`, но **фактически нигде не
> используется** в коде бэкенда: refresh-токены — это случайные байты, а не JWT, так что
> отдельный секрет им не нужен (реально читается только `JWT_ACCESS_SECRET`, через `getOrThrow`, в
> `token.service.ts` и `jwt.strategy.ts`). При рефакторинге можно смело убрать переменную или
> задокументировать её как зарезервированную на будущее.

## Основные команды (из корня, через Turborepo)

| Команда                                                   | Что делает                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`                                                | запускает web (`:3000`) и backend (`:3001`) параллельно, без кэша         |
| `pnpm build`                                              | собирает все пакеты (сначала `packages/shared` — `dependsOn: ["^build"]`) |
| `pnpm lint`                                               | ESLint (flat config, ESLint 10) по всем пакетам                           |
| `pnpm typecheck`                                          | `tsc --noEmit` по всем пакетам                                            |
| `pnpm format`                                             | форматирование                                                            |
| `pnpm db:up` / `db:migrate` / `db:studio` / `db:generate` | Docker/Prisma-обвязка                                                     |
| `pnpm test` / `pnpm test:e2e`                             | см. раздел «Тестирование» ниже                                            |

Запуск для одного приложения или одного теста:

```bash
pnpm --filter @expense-tracker/web dev
pnpm --filter @expense-tracker/backend test -- -t "returns a health payload"
```

Имена воркспейсов: `@expense-tracker/{web,backend,shared,tsconfig,eslint-config}` — пакет
бэкенда называется `backend`, не `api`.

## Тестирование

Формально не в фокусе проекта сейчас: `pnpm test`/`pnpm test:e2e` ожидаемо падают, потому что
генератор Prisma эмитит `.ts`-файлы с `.js`-импортами, которые Jest не может резолвить — это
известное и не являющееся регрессией поведение. Полагайтесь на `pnpm typecheck` и `pnpm lint` как
на основную проверку корректности.

Backend e2e-тест (`apps/backend/test/app.e2e-spec.ts`) стабит `PrismaService`, чтобы не требовать
реальной БД — сохраняйте этот подход, если тест не нуждается в Postgres по существу.

## Работа с `packages/shared`

Любая новая или изменённая форма данных (запрос/ответ API) описывается один раз как zod-схема в
`packages/shared/src/*.ts` и экспортируется через барель `src/index.ts`. Backend использует схему
для валидации через `createZodDto`, frontend — выведенный тип через `z.infer` (кастуется, не
парсится повторно).

**Важно**: `pnpm dev` не пересобирает `packages/shared` автоматически. После правки
`packages/shared/src` во время разработки:

```bash
pnpm --filter @expense-tracker/shared build
# либо держите отдельно запущенным:
pnpm --filter @expense-tracker/shared dev   # tsup --watch
```

Иначе оба приложения продолжат использовать старый `dist`.

## Работа с бэкендом (NestJS + CQRS)

Структура фичи-модуля: `controller + repository + commands/ + queries/ + dto/`, хендлеры — в
`commands/handlers/` и `queries/handlers/`. Смотрите `category/` или `transaction/` как образец
при добавлении новой фичи.

Правила:

- Не создавайте отдельный сервисный слой — вся логика идёт в CQRS-хендлеры.
- Команды/запросы наследуют `Command<T>`/`Query<T>`, вызывают `super()`.
- Репозитории возвращают Prisma-типы напрямую (`Prisma.XGetPayload<{...}>` для джойнов), а не
  собственные DTO — маппинг в DTO делает контроллер.
- Методы, которые должны учитывать владельца записи, называйте `...ForUser(id, userId)` и
  фильтруйте по `userId` в самом Prisma-запросе (а не проверкой после загрузки).
- Импорт зависимостей для DI — обычным `import`, не `import type`.
- Новый REST-эндпоинт = DTO-класс (`extends createZodDto(schema)`) + `@ZodResponse({ type: ... })`
  на методе контроллера — этого достаточно и для рантайм-валидации, и для Swagger-документации.
  OpenAPI-схему руками не пишем.
- Защищённые контроллеры — `@ApiBearerAuth()` + `@UseGuards(JwtAuthGuard)` на уровне класса.

### Prisma 7 — нюансы

- Клиент генерируется в `apps/backend/src/generated/prisma` (в `.gitignore`) — запускайте
  `pnpm db:generate` после клонирования и после любого изменения `schema.prisma`.
- Импортируйте клиент только из `../generated/prisma/client`, никогда из `@prisma/client`.
- `PrismaService` не наследует `PrismaClient`, а композирует его с `PrismaPg`-адаптером — не
  меняйте этот паттерн без веской причины (наследование теряет делегаты моделей).
- Строка подключения для CLI (`migrate`, `studio`) читается через `apps/backend/prisma.config.ts`,
  а не напрямую из `schema.prisma` (там больше нет поля `url`).

## Работа с фронтендом (Next.js 16, FSD)

Слои идут строго «сверху вниз»: `app → _pages → widgets → features → entities → shared`.
Публичный интерфейс среза — его `index.ts`; это не форсируется линтером, поэтому соблюдайте
дисциплину вручную и проверяйте на код-ревью.

- Роутинг — в `apps/web/app/`, а не в `src/app` (используйте существующие route-группы `(app)` и
  `(auth)`).
- Для обращений к бэкенду из серверных компонентов используйте `serverFetch<T>()`
  (`shared/api/server-fetch.ts`) — он уже читает access-токен из куки и кастует ответ к нужному
  типу. Не создавайте параллельных способов похода на API.
- Route Handlers (`app/api/auth/*/route.ts`) — единственное место, где логика логина/регистрации/
  рефреша/логаута трогает бэкендовые `/api/auth/*` напрямую и работает с cookies. Не переносите
  эту логику в клиентские компоненты.
- Токены никогда не должны попадать в JS-доступную память/localStorage — только httpOnly-куки.
- `apps/web/proxy.ts` обязан оставаться на Node-рантайме (не Edge) — там живёт in-memory Map для
  дедупликации параллельных refresh-запросов. Если меняете список защищённых путей
  (`PROTECTED_PATHS` в `shared/config/routes.ts`), синхронно обновите `matcher` в `proxy.ts`.
- Новые формы пользовательского ввода — `react-hook-form` + `zodResolver`, схема — импорт из
  `packages/shared` (не дублируйте руками).
- Next.js не транспилирует workspace-пакеты по умолчанию — `@expense-tracker/shared` явно
  прописан в `transpilePackages` в `next.config.ts`; не забывайте про это при добавлении новых
  внутренних пакетов.
- Tailwind v4 без `tailwind.config.js` — токены темы объявлены в `app/styles/globals.css` через
  `@theme inline`; тёмная тема — класс-based (`next-themes` + `@custom-variant`).

## TypeScript и линтинг

- TypeScript зафиксирован на версии ровно `5.9.3` во всех пакетах — `@nestjs/cli@11` тянет TS 5.7
  и зависит от `emitDecoratorMetadata`; не поднимайте версию до 7.x, пока Nest её не поддержит.
- ESLint — flat config (ESLint 10) везде; `eslint.config.mjs` в каждом приложении просто
  ре-экспортирует `packages/eslint-config` — специфичные для приложения правила добавляйте в
  общий пакет, а не локально, если они не специфичны именно для этого приложения.

## Git-flow и PR

- GitHub Flow: ветки от `main`, прямые коммиты в `main` запрещены.
- [Conventional Commits](https://www.conventionalcommits.org/) для сообщений коммитов и заголовков
  PR (`feat(transaction): add transaction module`) — начиная с текущей точки, история до этого не
  переписывается.
- PR создаются через `gh pr create`; описание обязательно содержит **Summary** (что изменилось, по
  диффу) и **Test plan** (чекбоксы: `pnpm typecheck`, `pnpm lint`, ручная проверка UI).

## Известные несоответствия документации/кода (на заметку)

- Заголовок `apps/backend/prisma/schema.prisma` называет схему "model-less scaffold" — на деле в
  ней 4 модели; комментарий устарел.
- `JWT_REFRESH_SECRET` объявлен, но не используется нигде в коде (см. раздел про переменные
  окружения выше).
- Состояние продукта на момент написания: health-check, полный auth-флоу, CRUD категорий, CRUD +
  пагинация + месячная сводка транзакций — готовы; модель бюджетов (budgets) ещё не начата.
