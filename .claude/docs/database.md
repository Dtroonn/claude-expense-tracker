# Схема БД

Файл схемы: `apps/backend/prisma/schema.prisma`. СУБД — PostgreSQL 17 (Docker,
`docker-compose.yml`).

> Заголовок файла схемы утверждает «Intentionally model-less: scaffold, add your first model» —
> это устаревший комментарий, оставшийся от исходного шаблона. На деле схема уже содержит 4
> полноценные модели, описанные ниже.

## Генератор и датасорс

```prisma
generator client {
  provider               = "prisma-client"              // Prisma 7: prisma-client-js больше нет
  output                 = "../src/generated/prisma"    // .gitignore, генерируется `pnpm db:generate`
  moduleFormat           = "cjs"                          // обязателен cjs — Nest компилирует в CJS
  generatedFileExtension = "ts"
  importFileExtension    = "js"
}

datasource db {
  provider = "postgresql"   // без `url` — Prisma 7 убрал это поле из схемы;
                             // строка подключения читается из apps/backend/prisma.config.ts
}
```

Клиент импортируется по пути `../generated/prisma/client` — **никогда** не `@prisma/client`.
`PrismaService` не наследует `PrismaClient` (иначе теряются `$connect`/делегаты моделей), а
композирует: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`, доступен как
`this.prisma.client.<model>`.

## Модели

### `User`

| Поле            | Тип                    | Назначение                                |
| --------------- | ---------------------- | ----------------------------------------- |
| `id`            | String (uuid, PK)      | идентификатор пользователя                |
| `email`         | String, `@unique`      | логин, используется для входа             |
| `name`          | String                 | отображаемое имя                          |
| `passwordHash`  | String                 | bcrypt-хэш пароля, 12 salt rounds         |
| `createdAt`     | DateTime               | момент регистрации                        |
| `updatedAt`     | DateTime, `@updatedAt` | автообновление при любом изменении записи |
| `refreshTokens` | `RefreshToken[]`       | связанные refresh-токены                  |
| `categories`    | `Category[]`           | категории, созданные пользователем        |
| `transactions`  | `Transaction[]`        | транзакции пользователя                   |

### `RefreshToken`

Хранит состояние refresh-токенов для их ротации/отзыва (сами токены не JWT — см.
[architecture.md](./architecture.md#аутентификация--сквозной-механизм)).

| Поле                | Тип                     | Назначение                                                                                                        |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`                | String (uuid, PK)       | идентификатор записи                                                                                              |
| `tokenHash`         | String, `@unique`       | SHA-256 hex сырого 32-байтного токена — детерминированный хэш нужен для поиска по равенству (в отличие от bcrypt) |
| `userId`            | String (FK → `User.id`) | владелец токена                                                                                                   |
| `user`              | relation                | `onDelete: Cascade` — удаление пользователя удаляет его токены                                                    |
| `expiresAt`         | DateTime                | срок жизни токена                                                                                                 |
| `revokedAt`         | DateTime?               | момент отзыва/использования; `null`, пока токен активен                                                           |
| `createdAt`         | DateTime                | момент выпуска                                                                                                    |
| `@@index([userId])` |                         | ускоряет выборку токенов пользователя                                                                             |

### `Category`

| Поле                        | Тип                     | Назначение                                                                                 |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| `id`                        | String (uuid, PK)       | идентификатор категории                                                                    |
| `title`                     | String                  | название категории                                                                         |
| `color`                     | String                  | HEX-цвет (`#RRGGBB`), валидируется на уровне приложения (`colorSchema`)                    |
| `icon`                      | String                  | идентификатор/имя иконки для UI                                                            |
| `userId`                    | String (FK → `User.id`) | владелец категории                                                                         |
| `user`                      | relation                | `onDelete: Cascade`                                                                        |
| `createdAt`                 | DateTime                |                                                                                            |
| `updatedAt`                 | DateTime, `@updatedAt`  |                                                                                            |
| `transactions`              | `Transaction[]`         | транзакции в этой категории                                                                |
| `@@unique([userId, title])` |                         | название уникально в рамках одного пользователя — источник 409 при создании/переименовании |
| `@@index([userId])`         |                         | ускоряет выборку категорий пользователя                                                    |

### `TransactionType` (enum)

```prisma
enum TransactionType {
  INCOME
  EXPENSE
}
```

### `Transaction`

| Поле                      | Тип                          | Назначение                                                                                                                         |
| ------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | String (uuid, PK)            | идентификатор транзакции                                                                                                           |
| `amount`                  | Decimal `@db.Decimal(12, 2)` | сумма; на границе API конвертируется в `number` контроллером                                                                       |
| `type`                    | `TransactionType`            | доход или расход                                                                                                                   |
| `description`             | String?                      | опциональный комментарий                                                                                                           |
| `date`                    | DateTime                     | дата операции (используется для фильтрации и месячной сводки)                                                                      |
| `categoryId`              | String (FK → `Category.id`)  | категория операции                                                                                                                 |
| `category`                | relation                     | `onDelete: Restrict` — **нельзя удалить категорию, у которой есть транзакции** (источник 409 `P2003` при `DELETE /categories/:id`) |
| `userId`                  | String (FK → `User.id`)      | владелец транзакции                                                                                                                |
| `user`                    | relation                     | `onDelete: Cascade`                                                                                                                |
| `createdAt`               | DateTime                     |                                                                                                                                    |
| `@@index([userId, date])` |                              | ускоряет пагинированный список/фильтр по датам для пользователя                                                                    |
| `@@index([categoryId])`   |                              | ускоряет джойн/фильтр по категории                                                                                                 |

## Связи между таблицами

```
User 1──* RefreshToken   (Cascade)
User 1──* Category       (Cascade)
User 1──* Transaction    (Cascade)
Category 1──* Transaction (Restrict — нельзя удалить категорию с транзакциями)
```

## Миграции

`apps/backend/prisma/migrations/`:

1. `20260826141433_add_user_and_refresh_token`
2. `20260827162903_add_category`
3. `20260830151803_add_transactions`

## Команды

```bash
pnpm db:up          # поднимает Postgres в Docker (docker-compose)
pnpm db:generate     # генерирует Prisma Client в apps/backend/src/generated/prisma (обязательно после клона)
pnpm db:migrate      # применяет миграции (dev)
pnpm db:studio       # Prisma Studio
```

CLI (`migrate`/`studio`) читает `DATABASE_URL` через `apps/backend/prisma.config.ts` (грузит
`.env` через `dotenv`: сначала корневой `../../.env`, затем локальный `.env` бэкенда как
override) — это отдельный путь получения строки подключения от рантайм-адаптера
(`PrismaPg`), который тоже читает `DATABASE_URL`, но напрямую через `ConfigService`.
