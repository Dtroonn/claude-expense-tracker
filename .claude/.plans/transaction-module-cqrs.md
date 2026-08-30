# Модуль транзакций (Transaction)

## Контекст

В репозитории уже есть `User`, `Auth` (регистрация/логин/refresh/logout, JWT + guards) и
`Category` (полный CRUD на CQRS). Не хватает центральной сущности приложения — **транзакции**
доходов и расходов. Без неё категории ни к чему не привязаны, и месячные агрегации
(сколько потрачено, каков баланс) построить не на чем.

Транзакция принадлежит пользователю, поэтому все endpoints защищены существующим
`JwtAuthGuard` и оперируют `userId` из токена — никогда из тела запроса. Реализация следует
принятым в репозитории паттернам: zod-контракты в `packages/shared`, CQRS без сервисного
слоя, репозиторий поверх `PrismaService.client`, валидация через `ZodValidationPipe`.

Scope: **только backend + shared**. Фронтенд (страницы, route handlers, хуки) — вне задачи.

## Решения (согласованы с пользователем)

- **`amount` на проводе — `z.number()`, конверсия `.toNumber()` в контроллере.**
  Вариант «сделать transform прямо в zod-схеме» проверен эмпирически и не работает:
  `z.toJSONSchema()` (zod 4.4.3) кидает `Transforms cannot be represented in JSON Schema`
  и при `io: 'input'`, и при `io: 'output'`; а `nestjs-zod@5.5.0` вызывает его как
  `toJSONSchema(schema, { io })` (`dist/dto-CHeB-l1i.mjs:371`) — без `unrepresentable: 'any'`
  и без возможности передать опцию из `createZodDto`. Обойти на уровне DTO нельзя, transform
  в любой схеме транзакции ломает генерацию Swagger. Даже с `unrepresentable: 'any'` поле
  выродилось бы в `"amount": {}` — Swagger потерял бы тип.
  Это та же причина, по которой `packages/shared/src/common.ts` держит `isoDateSchema`
  строкой, а не `z.date()`; конверсия в контроллере зеркалит уже существующий
  `createdAt.toISOString()`.
- **Схемы query-параметров получают постфикс `Query`**: `transactionFilterQuerySchema`,
  `transactionSummaryQuerySchema` (типы — `...QueryDto`). Отличает их от схем тела запроса
  и от response-схем. Конвенция распространяется на будущие модули.
- **`summary` возвращает только итоги** — `totalIncome`, `totalExpense`, `balance`
  (+ эхо `month`/`year`). Разбивка `byCategory` намеренно исключена как не имеющая смысла.
- Полный CRUD + список с фильтрами + месячная агрегация.

---

## 1. Prisma schema

В `apps/backend/prisma/schema.prisma` добавить enum и модель:

```prisma
enum TransactionType {
  INCOME
  EXPENSE
}

model Transaction {
  id          String          @id @default(uuid())
  amount      Decimal         @db.Decimal(12, 2)
  type        TransactionType
  description String?
  date        DateTime
  categoryId  String
  category    Category        @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  userId      String
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime        @default(now())

  @@index([userId, date])
  @@index([categoryId])
}
```

Обратные связи: в `model User` добавить `transactions Transaction[]`, в `model Category` —
то же самое.

Затем: `pnpm db:up` (нужен запущенный Docker Desktop) →
`pnpm db:migrate --name add-transactions` (либо `npx prisma migrate dev --name add-transactions`)
→ `pnpm db:generate` — генерируемый клиент гитигнорится, без генерации бэкенд не соберётся.

`onDelete: Restrict` на категории — намеренно: удаление категории с транзакциями должно
падать, а не уносить историю.

> **Известное следствие, вне scope.** Prisma вернёт `P2003`, а `DeleteCategoryHandler`
> его не ловит — наружу выйдет 500 вместо 409. Правка на одну строку в существующем
> `category/commands/handlers/delete-category.handler.ts`; в эту задачу не входит.

## 2. Контракты — `packages/shared/src/transaction.ts` (новый файл)

По образцу `packages/shared/src/category.ts`; `isoDateSchema` импортируется из `./common`.

`transactionTypeSchema` + тип `TransactionType`:

```ts
export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);
```

`transactionResponseSchema` + `TransactionResponseDto`:

```ts
export const transactionResponseSchema = z.object({
  id: z.string(),
  amount: z.number(), // Decimal -> .toNumber() в контроллере
  type: transactionTypeSchema,
  description: z.string().nullable(),
  date: isoDateSchema,
  categoryId: z.string(),
  createdAt: isoDateSchema,
});
```

`transactionListResponseSchema = z.array(transactionResponseSchema)` + тип.

`createTransactionSchema` + `CreateTransactionDto`:

```ts
export const createTransactionSchema = z.object({
  amount: z.number().positive(),
  type: transactionTypeSchema,
  description: z.string().trim().min(1).nullish(),
  date: isoDateSchema,
  categoryId: z.uuid(),
});
```

`updateTransactionSchema` — `.partial()` + `.refine(Object.keys(v).length > 0)`,
как `updateCategorySchema`.

`transactionFilterQuerySchema` + `TransactionFilterQueryDto` — все поля опциональные:

```ts
export const transactionFilterQuerySchema = z.object({
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  type: transactionTypeSchema.optional(),
  categoryId: z.uuid().optional(),
});
```

`transactionSummaryQuerySchema` + `TransactionSummaryQueryDto` — `month` и `year`
**обязательные**:

```ts
export const transactionSummaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1970).max(9999),
});
```

> **Проверить `z.toJSONSchema` на summary-query DTO.** `z.coerce.number()` — это `ZodPipe`,
> а не `.transform()`, и в JSON Schema представим, но это надо подтвердить тем же
> однострочником, которым проверялся transform (запускать из `packages/shared`, где
> резолвится zod). Если упрётся — заменить на `z.string().regex(/^\d+$/)` и `Number()`
> в контроллере.

`transactionSummarySchema` + `TransactionSummaryDto`:

```ts
export const transactionSummarySchema = z.object({
  month: z.number(),
  year: z.number(),
  totalIncome: z.number(),
  totalExpense: z.number(),
  balance: z.number(),
});
```

Дописать `export * from './transaction';` в `packages/shared/src/index.ts` и обновить
комментарий-шапку («Currently: health, user, auth, category, transaction»).

После правки — `pnpm --filter @expense-tracker/shared build`: consumers читают `dist`, не `src`.

## 3. Backend — `apps/backend/src/transaction/`

Структура — зеркало `apps/backend/src/category/`.

### `transaction.repository.ts`

По образцу `category.repository.ts`: `this.prisma.client.transaction.*`, типы
`Transaction` / `Prisma` из `@/generated/prisma/client`.

- `create(input: Prisma.TransactionCreateInput): Promise<Transaction>`
- `findManyByUserId(userId, filter): Promise<Transaction[]>` — собирает `where`
  из `dateFrom`/`dateTo` (`date: { gte, lte }`), `type`, `categoryId`;
  `orderBy: { date: 'desc' }`
- `findByIdForUser(id, userId): Promise<Transaction | null>`
- `update(id, data: Prisma.TransactionUpdateInput): Promise<Transaction>`
- `delete(id): Promise<void>`
- `sumByTypeForPeriod(userId, from, to)` — `groupBy({ by: ['type'], _sum: { amount: true } })`

### Команды и запросы

Расширяют `Command<T>` / `Query<T>` из `@nestjs/cqrs`, вызывают `super()`; результат —
генерируемые Prisma-типы либо тип из shared. Никакого `TransactionService`.

- `commands/create-transaction.command.ts` → `Command<Transaction>`
- `commands/update-transaction.command.ts` → `Command<Transaction>`
- `commands/delete-transaction.command.ts` → `Command<void>`
- `queries/get-transactions.query.ts` → `Query<Transaction[]>`
- `queries/get-transaction.query.ts` → `Query<Transaction>`
- `queries/get-transaction-summary.query.ts` → `Query<TransactionSummaryDto>`

### Обработчики

- `CreateTransactionHandler` — проверяет, что `categoryId` принадлежит пользователю
  через `CategoryRepository.findByIdForUser`, иначе `NotFoundException('Category not found')`
- `UpdateTransactionHandler` — `findByIdForUser` → `NotFoundException`; при смене
  `categoryId` та же проверка владения категорией
- `DeleteTransactionHandler` — `findByIdForUser` → `NotFoundException` → `delete`
- `GetTransactionsHandler`
- `GetTransactionHandler` — `NotFoundException` если `null`
- `GetTransactionSummaryHandler` — из `month`/`year` строит границы
  `Date.UTC(year, month - 1, 1)` .. `Date.UTC(year, month, 1)` (полуинтервал `gte`/`lt`),
  зовёт `sumByTypeForPeriod`, конвертирует `Decimal` → number через `.toNumber()`,
  считает `balance = totalIncome - totalExpense`. Отсутствующий в результате `groupBy`
  тип (нет ни одной транзакции за месяц) даёт `0`, а не `undefined`

### DTO-классы

`dto/transaction-response.dto.ts`, `create-transaction.dto.ts`, `update-transaction.dto.ts`,
`transaction-filter-query.dto.ts`, `transaction-summary-query.dto.ts`,
`transaction-summary.dto.ts` — все через `createZodDto(<схема из @expense-tracker/shared>)`,
суффикс класса `...DtoClass`.

### `transaction.controller.ts`

`@ApiTags('transactions')`, `@ApiBearerAuth()`, `@Controller('transactions')`,
`@UseGuards(JwtAuthGuard)`, `@CurrentUser()`, `@ZodResponse({ type: ... })` —
как в `category.controller.ts`.

Общий маппер записи в DTO:

```ts
const toDto = (t: Transaction): TransactionResponseDto => ({
  ...t,
  amount: t.amount.toNumber(),
  date: t.date.toISOString(),
  createdAt: t.createdAt.toISOString(),
});
```

Маршруты — **`summary` объявить ДО `:id`**, иначе `ParseUUIDPipe` на `:id`
перехватит `/transactions/summary` и вернёт 400.

| Метод  | Путь                    | Возврат                                             |
| ------ | ----------------------- | --------------------------------------------------- |
| POST   | `/transactions`         | `TransactionResponseDtoClass`                       |
| GET    | `/transactions`         | `[TransactionResponseDtoClass]`, `@Query()` фильтр  |
| GET    | `/transactions/summary` | `TransactionSummaryDtoClass`, `@Query()` month+year |
| GET    | `/transactions/:id`     | `TransactionResponseDtoClass`                       |
| PATCH  | `/transactions/:id`     | `TransactionResponseDtoClass`                       |
| DELETE | `/transactions/:id`     | 204, `@HttpCode(HttpStatus.NO_CONTENT)`             |

### `transaction.module.ts`

`imports: [CqrsModule, AuthModule, CategoryModule]`, `controllers: [TransactionController]`,
`providers: [TransactionRepository, ...commandHandlers, ...queryHandlers]`.
`PrismaModule` не импортируется — он `@Global()`.

### `category.module.ts` (правка существующего файла)

Добавить `exports: [CategoryRepository]`, чтобы `CreateTransactionHandler` мог проверять
владение категорией. Альтернатива (дублировать запрос категории в transaction-репозитории)
хуже.

### `app.module.ts`

Зарегистрировать `TransactionModule` в `imports`.

---

## Verification

`pnpm typecheck`, `pnpm lint`, `pnpm build` — из корня.

Тесты не трогаем — `CLAUDE.md` явно выводит их из scope, и e2e сейчас падает на резолве
сгенерированного Prisma-клиента независимо от этой задачи.

Ручная проверка после `pnpm dev`, Swagger на http://localhost:3001/docs: все 6 маршрутов
отрисовались (это же подтверждает, что `z.toJSONSchema` не упал ни на одной схеме), `amount`
показан как `number`, `/transactions/summary` не съеден маршрутом `:id`. Затем сценарий:
register → login → создать категорию → POST транзакции (INCOME и EXPENSE) → GET с фильтрами
`type` / `dateFrom` / `dateTo` / `categoryId` → GET `/summary?month=&year=` и сверить
`totalIncome`/`totalExpense`/`balance` вручную (в т.ч. пустой месяц → нули, а не `null`) →
PATCH → DELETE → 404 на повторный GET.

---

## Чек-лист реализации

- [x] **Prisma schema** — enum `TransactionType`, модель `Transaction`, обратные связи
      в `User` и `Category` (раздел 1)
- [x] **Миграция** — `pnpm db:up`, `pnpm db:migrate --name add-transactions`, `pnpm db:generate`
- [x] **Контракты** — `packages/shared/src/transaction.ts` целиком + re-export
      в `index.ts` (раздел 2)
- [x] **Проверка `z.toJSONSchema` на summary-query** — подтвердить, что `z.coerce.number()`
      не ломает генерацию; иначе перейти на `z.string().regex()` + `Number()`
      (подтверждено: генерирует `type: integer`, схема не меняется)
- [x] **Сборка shared** — `pnpm --filter @expense-tracker/shared build`
- [x] **Repository** — `transaction.repository.ts`, все 6 методов
- [x] **Команды и запросы** — 3 команды + 3 запроса
- [x] **Обработчики** — 3 command handler'а + 3 query handler'а
- [x] **DTO-классы** — 6 файлов в `dto/`
- [x] **Controller** — `transaction.controller.ts`, 6 маршрутов, `summary` до `:id`, маппер `toDto`
- [x] **Module** — `transaction.module.ts`
- [x] **Правка `category.module.ts`** — `exports: [CategoryRepository]`
- [x] **Правка `app.module.ts`** — регистрация `TransactionModule`
- [x] **Сборка проекта** — `pnpm typecheck`, `pnpm lint`, `pnpm build`
- [x] **Ручная проверка** — Swagger + сценарий из раздела Verification
