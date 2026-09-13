# Архитектура

## Обзор

Expense Tracker — монорепозиторий на pnpm workspaces + Turborepo, состоящий из двух приложений и
одного общего пакета:

```
apps/web        Next.js 16 (App Router), React 19, Tailwind v4   :3000
apps/backend    NestJS 11 + Prisma 7, CQRS                       :3001, маршруты под /api
packages/shared zod-схемы, используемые ОБОИМИ приложениями
packages/{tsconfig,eslint-config}  общие конфиги
```

Инфраструктура: PostgreSQL 17 в Docker (`docker-compose.yml`, сервис `postgres`,
`expense-tracker-db`).

## Ключевой принцип: shared contracts как «позвоночник»

`packages/shared` — единственный источник истины для форм данных. Каждая сущность описывается
zod-схемой, из которой выводится TypeScript-тип (`z.infer`). Пример-эталон: `src/health.ts`.

- **Backend** валидирует данные через эти схемы в обе стороны:
  - входящие запросы — глобальный `ZodValidationPipe` (`nestjs-zod`) + DTO-классы вида
    `class XDtoClass extends createZodDto(xSchema) {}`;
  - исходящие ответы — декоратор `@ZodResponse({ type: XDtoClass })` на методах контроллера,
    обрабатываемый глобальным `ZodSerializerInterceptor` (`APP_INTERCEPTOR` в `app.module.ts`).
- **Frontend** импортирует только выведенный TypeScript-тип и **кастует** ответ (`as XDto`),
  не парсит повторно — бэкенд уже всё провалидировал. Zod на фронтенде используется только для
  пользовательского ввода, которого бэкенд ещё не видел (react-hook-form + `zodResolver`,
  например `loginSchema`/`registerSchema`).
- Никогда не дублируются вручную интерфейсы на одной из сторон — тип всегда один, из
  `packages/shared`.

`packages/shared` собирается через `tsup` в двух форматах (cjs для Nest, esm для Next),
`dts: false` — поле `types` в `package.json` указывает прямо на `src/index.ts`. Корневые
`build`/`lint`/`typecheck`/`test` пересобирают его автоматически (Turborepo
`dependsOn: ["^build"]`); `pnpm dev` — **нет**, поэтому при правке `packages/shared/src` во время
`pnpm dev` нужно пересобрать вручную (`pnpm --filter @expense-tracker/shared build` или запустить
его `dev`/`tsup --watch` параллельно).

## Backend: NestJS 11 + CQRS

### Bootstrap (`apps/backend/src/main.ts`)

- Глобальный префикс маршрутов: `api` (все роуты — `/api/...`).
- Глобальный пайп: `ZodValidationPipe` — валидирует `@Body()`/`@Query()`/`@Param()`.
- CORS: origin из `CORS_ORIGIN`, `credentials: true`.
- Swagger UI на `/docs` (`src/swagger.ts`, `DocumentBuilder.addBearerAuth()`,
  `cleanupOpenApiDoc` убирает шум zod-схем из документа).

### `AppModule`

- `ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] })` — сначала
  локальный `.env` бэкенда, затем корневой (общий с docker-compose).
- `CqrsModule.forRoot()`.
- Глобальный интерцептор `ZodSerializerInterceptor` (пара к `@ZodResponse`).
- Импортирует: `PrismaModule` (глобальный), `UserModule`, `AuthModule`, `CategoryModule`,
  `TransactionModule`.

### Модули

| Модуль              | Файл                                    | Провайдеры                                                                                  |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `AppModule`         | `src/app.module.ts`                     | `AppService`, `APP_INTERCEPTOR`                                                             |
| `PrismaModule`      | `src/prisma/prisma.module.ts`           | `@Global()`, `PrismaService`                                                                |
| `CryptoModule`      | `src/shared/crypto/crypto.module.ts`    | `PasswordHasherService` (bcrypt, 12 salt rounds)                                            |
| `UserModule`        | `src/user/user.module.ts`               | `UserRepository` + command/query handlers                                                   |
| `AuthModule`        | `src/auth/auth.module.ts`               | `TokenService`, `RefreshTokenRepository`, `JwtStrategy`, `JwtAuthGuard`, 4 command-хендлера |
| `CategoryModule`    | `src/category/category.module.ts`       | `CategoryRepository`, 3 команды, 1 запрос                                                   |
| `TransactionModule` | `src/transaction/transaction.module.ts` | `TransactionRepository`, 3 команды, 3 запроса                                               |

### CQRS-конвенции

- Отдельного слоя сервисов на фичу нет — бизнес-логика живёт в хендлерах; структура фичи:
  `controller + repository + commands/ + queries/ + dto/`, хендлеры — в
  `commands|queries/handlers/`.
- Команды/запросы наследуют `Command<T>`/`Query<T>` и вызывают `super()` — шинам не нужны
  дженерик-аргументы.
- Репозитории возвращают **сгенерированные Prisma-типы** напрямую (`User`, `Category`,
  `Prisma.XCreateInput`, `Prisma.XGetPayload<{...}>` для джойнов — например
  `TransactionWithCategory` в `transaction.repository.ts`).
- Преобразование строки БД → DTO (`Decimal` → `number`, `Date` → ISO-строка) происходит в
  **контроллере** (см. `toDto()` в `transaction.controller.ts`).
- Каждый user-scoped метод репозитория называется `...ForUser` и фильтрует по `userId` прямо в
  запросе — владение проверяется на уровне запроса, а не постфактум.
- Параметры конструктора для инъекции — обычный value-импорт, не `import type`.

## Frontend: Next.js 16, Feature-Sliced Design

Роутинг (App Router) лежит **вне** `src`, в `apps/web/app/`:

```
app/
  layout.tsx                    корневой HTML-шелл (ThemeProvider/ThemeScript)
  (app)/layout.tsx              Sidebar + main
  (app)/page.tsx                → TransactionsPage ("/")
  (app)/categories/page.tsx     → CategoriesPage
  (app)/profile/page.tsx        → ProfilePage
  (auth)/layout.tsx             узкий центрированный шелл
  (auth)/login/page.tsx, (auth)/register/page.tsx
  api/auth/{login,register,refresh,logout}/route.ts   Route Handlers-прокси к бэкенду
```

`apps/web/proxy.ts` — замена `middleware.ts` в Next 16, **обязан** работать на Node-рантайме (не
Edge), см. раздел про refresh ниже.

Слои FSD в `apps/web/src` (импорты идут только «сверху вниз»; публичный API каждого среза — его
`index.ts`):

```
app → _pages → widgets → features → entities → shared
```

- `app/styles/globals.css` — Tailwind v4 токены (`@theme inline`), конфиг-файла tailwind нет.
- `_pages/` — сборка страниц (`categories`, `login`, `profile`, `register`, `transactions`);
  префикс `_` — чтобы не конфликтовать с зарезервированным `pages` в Next.
- `widgets/sidebar` — единственный виджет (осознанно: используется на всех защищённых страницах).
- `features/` — `auth-login`, `auth-register`, `auth-logout`, `theme-toggle`.
- `entities/` — `category`, `transaction`, `user` (модели, API-клиенты, UI-примитивы сущности).
- `shared/` — `api/` (`server-fetch.ts`, `config.ts`, `proxy-error.ts`), `auth/` (cookies,
  refresh, токены), `config/routes.ts`, `ui/` (кнопки, карточки, инпуты — стиль shadcn),
  `theme/`.

### Поток данных фронтенда

1. Серверные компоненты вызывают API-функцию сущности (`getTransactions`, `getCategories`, ...),
   та вызывает `serverFetch<T>(path, init)` (`shared/api/server-fetch.ts`):
   читает httpOnly-куку `access_token` через `next/headers` `cookies()`, шлёт
   `Authorization: Bearer <token>` на `${API_URL}/api${path}`, кастует JSON в `T` без повторного
   парсинга. Бросает `UnauthorizedError` на 401. Импортируется только глубоким путём — не
   попадает в клиентский бандл.
2. Route Handlers (`app/api/auth/*/route.ts`) — единственное место, где фронтенд напрямую
   обращается к `/api/auth/*` бэкенда; превращают ответ в httpOnly Set-Cookie, никогда не
   возвращают токены в JSON-теле.
3. Страницы сначала вызывают `getSession()`, при отсутствии — `redirect(ROUTES.login)`, затем
   параллельно (`Promise.all`) грузят данные, отлавливая `UnauthorizedError`.

## Аутентификация — сквозной механизм

Stateless JWT access-токен + ротируемый непрозрачный (opaque) refresh-токен; оба доступны браузеру
только через httpOnly-куки (никогда не видны JS).

- **Access-токен** — JWT, подписанный `JWT_ACCESS_SECRET`, payload `{ user: UserResponseDto }`,
  срок жизни `JWT_ACCESS_EXPIRES_IN` (по умолчанию `15m`).
- **Refresh-токен** — НЕ JWT: `randomBytes(32).toString('hex')`. Хранится в таблице
  `RefreshToken` по `tokenHash = sha256(token)` (детерминированный хэш — нужен для поиска по
  равенству, в отличие от bcrypt). `expiresAt` = `JWT_REFRESH_EXPIRES_IN` (по умолчанию `7d`).
- **Ротация**: `redeemRefreshToken()` находит по хэшу, проверяет `revokedAt`/`expiresAt`, сразу
  помечает как отозванный и возвращает `userId` — вызывающий код выпускает новую пару. Каждый
  refresh-токен используется ровно один раз.
- **Guard**: `JwtAuthGuard` (Passport `AuthGuard('jwt')`) на уровне контроллера —
  `CategoryController` и `TransactionController` защищены полностью; `AuthController` и
  `AppController` — без guard'а.
- `apps/web/app/api/auth/refresh/route.ts` — единственная реализация обновления токенов; читает
  `refresh_token` из куки запроса (телу не доверяет), дедуплицирует параллельные обновления одного
  и того же токена через in-memory `Map` (окно грации ~15с).
- `apps/web/proxy.ts` — на Node-рантайме (не Edge, иначе `Map` дедупликации не переживёт запрос),
  проактивно дёргает `/api/auth/refresh`, когда до истечения access-токена осталось ≤30с
  (`ACCESS_REFRESH_THRESHOLD_SECONDS`), до рендера серверных компонентов (они не могут сами
  ставить куки). Редиректит на `/login` для защищённых путей (`PROTECTED_PATHS`) при отсутствии
  валидной сессии; `matcher` нужно синхронизировать с `PROTECTED_PATHS` вручную.
- `entities/user/model/session.ts` → `getSession()` — декодирует access-токен **без проверки
  подписи** (`jwt-decode`), только для отображения/тайминга; реальная проверка — на бэкенде.

Подробности по эндпоинтам и полям — в [API.md](./API.md) и [DATABASE.md](./DATABASE.md).
