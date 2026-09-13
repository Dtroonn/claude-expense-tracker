# API

Базовый URL: `http://localhost:3001/api` (глобальный префикс `api`, порт из `PORT`, по умолчанию
`3001`). Интерактивная документация Swagger: `http://localhost:3001/docs`.

Все DTO — тонкие обёртки над zod-схемами из `packages/shared`:
`class XDtoClass extends createZodDto(xSchema) {}`. Запросы валидируются глобальным
`ZodValidationPipe`, ответы сериализуются/валидируются через `@ZodResponse({ type: XDtoClass })` +
глобальный `ZodSerializerInterceptor`.

Все защищённые эндпоинты возвращают `401 Unauthorized`, если bearer-токен отсутствует, невалиден
или истёк (обрабатывается `JwtAuthGuard` до контроллера).

---

## Health

`AppController` (`src/app.controller.ts`), тег `health`, без аутентификации.

### `GET /api/health`

Ответ `HealthResponseDto`:

```json
{ "status": "ok", "service": "string", "version": "string", "timestamp": "ISO-8601" }
```

---

## Auth

`AuthController` (`src/auth/auth.controller.ts`), тег `auth`, без guard'а на контроллере (сами
эндпоинты и есть точка получения токенов).

| Метод | Путь                 | Тело запроса       | Ответ             | Статус | Ошибки                                            |
| ----- | -------------------- | ------------------ | ----------------- | ------ | ------------------------------------------------- |
| POST  | `/api/auth/register` | `RegisterDtoClass` | `AuthResponseDto` | 201    | 409 если email занят (внутри `CreateUserCommand`) |
| POST  | `/api/auth/login`    | `LoginDtoClass`    | `AuthResponseDto` | 201    | 401 неверные учётные данные                       |
| POST  | `/api/auth/refresh`  | `RefreshDtoClass`  | `AuthResponseDto` | 201    | 401 если refresh-токен невалиден/истёк/отозван    |
| POST  | `/api/auth/logout`   | `RefreshDtoClass`  | —                 | 204    | —                                                 |

**Схемы тел запроса** (`packages/shared/src/auth.ts`):

```ts
registerSchema: { email: string; name: string; password: string (min 8) }
loginSchema:    { email: string; password: string }
refreshSchema:  { refreshToken: string }
```

**`AuthResponseDto`**:

```ts
{
  user: { id, email, name, createdAt },     // userResponseSchema
  tokens: { accessToken, refreshToken, expiresIn }  // expiresIn — секунды
}
```

---

## Categories

`CategoryController` (`src/category/category.controller.ts`), тег `categories`,
`@ApiBearerAuth()` + `@UseGuards(JwtAuthGuard)` на всём контроллере — везде нужен
`Authorization: Bearer <accessToken>`.

| Метод  | Путь                  | Параметры/тело                                                    | Ответ                   | Ошибки                                                                                      |
| ------ | --------------------- | ----------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| GET    | `/api/categories`     | —                                                                 | `CategoryResponseDto[]` | —                                                                                           |
| POST   | `/api/categories`     | `CreateCategoryDtoClass` `{title, color, icon}`                   | `CategoryResponseDto`   | 409 при дублирующемся `title` (Prisma `P2002`, уникально в рамках пользователя)             |
| PATCH  | `/api/categories/:id` | `id` (UUID), `UpdateCategoryDtoClass` (частичный, минимум 1 поле) | `CategoryResponseDto`   | 404 не найдена/не принадлежит пользователю; 409 дубль `title`                               |
| DELETE | `/api/categories/:id` | `id` (UUID)                                                       | — (204)                 | 404 не найдена; 409 если у категории есть транзакции (Prisma `P2003`, `onDelete: Restrict`) |

**Схемы** (`packages/shared/src/category.ts`):

```ts
colorSchema: /^#[0-9a-fA-F]{6}$/
createCategorySchema: { title: string; color: colorSchema; icon: string }
updateCategorySchema: Partial<createCategorySchema> & минимум 1 ключ
categoryResponseSchema: { id, title, color, icon, createdAt }
```

---

## Transactions

`TransactionController` (`src/transaction/transaction.controller.ts`), тег `transactions`,
`@ApiBearerAuth()` + `@UseGuards(JwtAuthGuard)` на всём контроллере.

**Важно про порядок маршрутов**: `GET /transactions/summary` объявлен после
`GET /transactions`, но до `GET /transactions/:id` — иначе Express принял бы `summary` за
параметр `:id`.

| Метод  | Путь                        | Параметры/тело                                                | Ответ                      | Ошибки                                                    |
| ------ | --------------------------- | ------------------------------------------------------------- | -------------------------- | --------------------------------------------------------- |
| POST   | `/api/transactions`         | `CreateTransactionDtoClass`                                   | `TransactionResponseDto`   | 404 если категория не найдена/не принадлежит пользователю |
| GET    | `/api/transactions`         | query: пагинация + фильтры (см. ниже)                         | `PaginatedTransactionsDto` | —                                                         |
| GET    | `/api/transactions/summary` | query `{month, year}`                                         | `TransactionSummaryDto`    | —                                                         |
| GET    | `/api/transactions/:id`     | `id` (UUID)                                                   | `TransactionResponseDto`   | 404 не найдена/не принадлежит пользователю                |
| PATCH  | `/api/transactions/:id`     | `id`, `UpdateTransactionDtoClass` (частичный, минимум 1 поле) | `TransactionResponseDto`   | 404 транзакция или новая категория не найдены             |
| DELETE | `/api/transactions/:id`     | `id` (UUID)                                                   | — (204)                    | 404 не найдена                                            |

### Схемы (`packages/shared/src/transaction.ts`)

```ts
transactionTypeSchema: 'INCOME' | 'EXPENSE'

createTransactionSchema: {
  amount: number;              // > 0
  type: transactionTypeSchema;
  description?: string | null; // trim, min 1 символ, nullish
  date: string;                 // ISO-8601
  categoryId: string;           // uuid
}

updateTransactionSchema: Partial<createTransactionSchema> & минимум 1 ключ

transactionResponseSchema: {
  id: string;
  amount: number;               // Decimal(12,2) из БД конвертируется в number контроллером
  type: transactionTypeSchema;
  description: string | null;
  date: string;                 // ISO
  categoryId: string;
  category: { id, title, color, icon };   // вложенный снимок категории
  createdAt: string;            // ISO
}
```

### Query-параметры `GET /api/transactions`

Объединение пагинации (`paginationQuerySchema`) и фильтра
(`transactionFilterQuerySchema`):

| Параметр     | Тип                   | По умолчанию | Описание                                   |
| ------------ | --------------------- | ------------ | ------------------------------------------ |
| `page`       | number (coerced)      | 1            | номер страницы                             |
| `limit`      | number (coerced)      | 10           | размер страницы, максимум 100              |
| `dateFrom`   | ISO date              | —            | опциональный фильтр по дате (включительно) |
| `dateTo`     | ISO date              | —            | опциональный фильтр по дате                |
| `type`       | `INCOME` \| `EXPENSE` | —            | опциональный фильтр по типу                |
| `categoryId` | uuid                  | —            | опциональный фильтр по категории           |

**Ответ `PaginatedTransactionsDto`**:

```ts
{
  items: TransactionResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;   // max(1, ceil(total / limit))
    hasPrev: boolean;      // page > 1
    hasNext: boolean;      // page < totalPages
  };
}
```

`meta` вычисляется в контроллере (`transaction.controller.ts`), не в БД.

### `GET /api/transactions/summary`

Query: `{ month: number (1-12), year: number }`.

Ответ `TransactionSummaryDto`:

```ts
{
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
```

Диапазон месяца вычисляется общей утилитой `monthRangeUtc(year, month)`
(`packages/shared/src/transaction.ts`) — используется и бэкендом (для группировки), и фронтендом
(для консистентности отображения).

---

## Коды ошибок (сводно)

| Код | Когда                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------- |
| 400 | Невалидное тело/query (не проходит zod-схему через `ZodValidationPipe`)                                           |
| 401 | Отсутствует/невалиден/истёк JWT; неверные учётные данные при логине; невалидный refresh-токен                     |
| 404 | Сущность не найдена или не принадлежит текущему пользователю                                                      |
| 409 | Конфликт уникальности (email, `[userId, title]` категории) или FK-ограничение (удаление категории с транзакциями) |
| 204 | Успешное удаление / выход (logout) — тело ответа отсутствует                                                      |
