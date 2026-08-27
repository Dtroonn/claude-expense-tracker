# Модуль категорий расходов (Category)

## Контекст

В репозитории уже есть работающие `User` и `Auth` модули (регистрация/логин/refresh/logout,
JWT + guards), но доменное моделирование расходов ещё не начато. Первый шаг — сущность
**категория расходов**: `id`, `title`, `color`, `icon`, `userId`. Категория принадлежит
пользователю, поэтому все endpoints защищены существующим `JwtAuthGuard` и оперируют
`userId` из токена (никогда из тела запроса).

Реализация должна следовать уже принятым в репозитории паттернам: zod-контракты в
`packages/shared`, CQRS без сервисного слоя, репозиторий поверх `PrismaService.client`,
валидация через `ZodValidationPipe`.

## Решения (согласованы с пользователем)

- CRUD полный: create + list + update + delete.
- `color` — обязательный hex `/^#[0-9a-fA-F]{6}$/`; `icon` — обязательная непустая строка.
- `@@unique([userId, title])` — дубли названий у одного пользователя запрещены (409).

## 1. Prisma schema

`apps/backend/prisma/schema.prisma` — добавить модель и relation в `User`:

```prisma
model Category {
  id        String   @id @default(uuid())
  title     String
  color     String
  icon      String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, title])
  @@index([userId])
}
```

В `model User` добавить `categories Category[]`.

Затем: `pnpm db:migrate` (нужен запущенный Docker/`pnpm db:up`) и `pnpm db:generate`
— генерируемый клиент гитигнорится, без генерации бэкенд не соберётся.

## 2. Контракты — `packages/shared/src/category.ts` (новый файл)

По образцу `packages/shared/src/auth.ts` / `user.ts`: схема + `z.infer` тип, оба экспортируются.

**Новая конвенция именования.** Существующие контракты (`authResponseSchema`/`AuthResponse`,
`registerRequestSchema`/`RegisterRequest`) будут переименованы позже; `category` пишем сразу
в целевом стиле — схема `...Schema`, а выведенный из неё тип — DTO с суффиксом `Dto`:

```ts
export const categoryResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string(),
  icon: z.string(),
  createdAt: <union date|iso datetime → toISOString, как в publicUserSchema>,
});
export type CategoryResponseDto = z.infer<typeof categoryResponseSchema>;

export const categoryListResponseSchema = z.array(categoryResponseSchema);
export type CategoryListResponseDto = z.infer<typeof categoryListResponseSchema>;

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const createCategorySchema = z.object({
  title: z.string().min(1).trim(),
  color: colorSchema,
  icon: z.string().min(1).trim(),
});
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial()
  .refine((v) => Object.keys(v).length > 0, { message: '...' });
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
```

Схемы — `camelCase` (это значения), типы — `PascalCase` с `Dto`. Переименование старых
контрактов в этот стиль — отдельная задача, в этот объём не входит.

Важно: `userId` **не входит** в wire-контракт — он берётся из JWT.

Добавить `export * from './category';` в `packages/shared/src/index.ts`.

## 3. Backend — `apps/backend/src/category/`

Структура ровно как у `user/` + контроллер как у `auth/`:

```
category/
  category.controller.ts
  category.module.ts
  category.repository.ts
  commands/
    create-category.command.ts
    update-category.command.ts
    delete-category.command.ts
    handlers/{create,update,delete}-category.handler.ts
  queries/
    get-categories.query.ts
    handlers/get-categories.handler.ts
```

### `category.repository.ts`

По образцу `apps/backend/src/user/user.repository.ts`: инжектит `PrismaService`
(**value import**, не `import { type ... }` — иначе ломается DI, см. CLAUDE.md), обращается
через `this.prisma.client.category...`, возвращает сгенерированные типы
`Category` / `Prisma.CategoryCreateInput` из `@/generated/prisma/client`.

Методы:
- `create(input: Prisma.CategoryCreateInput): Promise<Category>`
- `findManyByUserId(userId: string): Promise<Category[]>` — `orderBy: { title: 'asc' }`
- `findByIdForUser(id: string, userId: string): Promise<Category | null>` — `findFirst({ where: { id, userId } })`
- `update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category>` — `where: { id }`
- `delete(id: string): Promise<void>` — `where: { id }`; prisma-делегат возвращает удалённую
  строку, поэтому тело метода её отбрасывает (`await ...delete(...)`), а не `return`'ит

Репозиторий остаётся тонким: `update`/`delete` адресуют строку по уникальному `id`.
Проверку принадлежности делает handler — через `findByIdForUser` перед записью
(см. «Обработчики»).

### Команды и запросы

Наследуют `Command<T>` / `Query<T>` из `@nestjs/cqrs` и вызывают `super()` — как
`apps/backend/src/user/queries/get-user-by-id.query.ts`. Тогда `commandBus.execute(...)`
выводит тип результата без generic-аргументов.

- `GetCategoriesQuery extends Query<Category[]>` — `(userId)`
- `CreateCategoryCommand extends Command<Category>` — `(userId, title, color, icon)`
- `UpdateCategoryCommand extends Command<Category>` — `(userId, id, data: UpdateCategoryDto)`
- `DeleteCategoryCommand extends Command<void>` — `(userId, id)`

Типы `Category` здесь — **prisma-типы** из `@/generated/prisma/client` (как у `User` в
user-модуле); в wire-shape их приводит контроллер через `categoryResponseSchema.parse`.

**О именах.** Суффикс `Dto` заодно снимает коллизию: wire-тип зовётся
`CategoryResponseDto`, а prisma-строка — `Category`, так что алиас не нужен и
`Category` импортируется из `@/generated/prisma/client` как есть (как `User` в user-модуле).
Команды/запросы/репозиторий типизируются prisma-типом `Category`, контроллер аннотирует
ответы `CategoryResponseDto` / `CategoryListResponseDto`.

### Обработчики

Бизнес-логика прямо в handler'ах, без `CategoryService` (см. CLAUDE.md «нет сервисного слоя»).

- `CreateCategoryHandler` — `repository.create({ title, color, icon, user: { connect: { id: userId } } })`;
  ловит Prisma unique-violation `P2002` → `ConflictException`.
- `UpdateCategoryHandler` — сперва `findByIdForUser(id, userId)`; если `null` →
  `NotFoundException`; затем `repository.update(id, data)`; `P2002` → `ConflictException`.
- `DeleteCategoryHandler` — та же проверка `findByIdForUser(id, userId)` →
  `NotFoundException`, затем `repository.delete(id)`.
- `GetCategoriesHandler` — `repository.findManyByUserId(query.userId)`.

Проверка принадлежности живёт в handler'е — это и есть то место, где по конвенции репозитория
находится бизнес-логика. Формально между `findByIdForUser` и записью есть окно гонки, но
единственный сценарий — параллельное удаление той же категории её же владельцем, что даёт
безобидную ошибку Prisma `P2025`, а не доступ к чужим данным.

Везде именно `NotFoundException`, а не `ForbiddenException`: чужой `id` не должен
подтверждать существование категории.

### `category.controller.ts`

По образцу `apps/backend/src/auth/auth.controller.ts`, плюс guard и `@CurrentUser`:

```ts
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get()
  async findAll(@CurrentUser() user: PublicUser): Promise<CategoryListResponseDto>

  @Post()
  async create(
    @CurrentUser() user: PublicUser,
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryDto,
  ): Promise<CategoryResponseDto>

  @Patch(':id')
  async update(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryDto,
  ): Promise<CategoryResponseDto>

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: PublicUser, @Param('id', ParseUUIDPipe) id: string): Promise<void>
}
```

Возвращаемые значения прогоняются через `categoryResponseSchema.parse` /
`categoryListResponseSchema.parse`
(так же, как `RegisterHandler` парсит `authResponseSchema`) — это обрезает `userId`/`updatedAt`
до wire-shape и сериализует даты.

`@CurrentUser()` пока нигде не используется — этот контроллер будет её первым потребителем.
`ParseUUIDPipe` — стандартный nest-пайп; он не конфликтует с глобальным `ValidationPipe`
из `main.ts`, а zod-схемы тел запросов глобальный пайп не трогает (типы тел — не классы).

Переиспользуемое, уже существующее:
- `apps/backend/src/auth/guards/jwt-auth.guard.ts` — `JwtAuthGuard`
- `apps/backend/src/auth/decorators/current-user.decorator.ts` — `@CurrentUser()`
- `apps/backend/src/common/pipes/zod-validation.pipe.ts` — `ZodValidationPipe`

### `category.module.ts`

По образцу `user.module.ts`:

```ts
const commandHandlers = [CreateCategoryHandler, UpdateCategoryHandler, DeleteCategoryHandler];
const queryHandlers = [GetCategoriesHandler];

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [CategoryController],
  providers: [CategoryRepository, ...commandHandlers, ...queryHandlers],
})
export class CategoryModule {}
```

`PrismaModule` глобальный — импортировать не нужно. А вот `AuthModule` импортировать **нужно**:
он объявляет `JwtStrategy` и экспортирует `JwtAuthGuard` (`exports: [JwtAuthGuard]`), поэтому
`imports: [CqrsModule, AuthModule]`.

### `app.module.ts`

Добавить `CategoryModule` в `imports`.

## Verification

Тесты вне скоупа (см. CLAUDE.md).

```bash
pnpm db:up            # Docker должен быть запущен
pnpm db:migrate       # создаст миграцию для Category
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm dev
```

Ручная проверка (routes под `/api`):

1. `POST /api/auth/register` → забрать `tokens.accessToken`.
2. `POST /api/categories` с `{"title":"Еда","color":"#ff8800","icon":"utensils"}` и
   `Authorization: Bearer <token>` → 201 + объект категории без `userId`.
3. Тот же POST повторно → 409.
4. `GET /api/categories` → массив с одной категорией.
5. `PATCH /api/categories/:id` с `{"color":"#00ff00"}` → 200, цвет обновлён.
6. `DELETE /api/categories/:id` → 204; повторный `DELETE` → 404.
7. Любой запрос без заголовка `Authorization` → 401.
8. Зарегистрировать второго пользователя, его токеном `GET /api/categories` → `[]`,
   а `PATCH`/`DELETE` по id чужой категории → 404.
