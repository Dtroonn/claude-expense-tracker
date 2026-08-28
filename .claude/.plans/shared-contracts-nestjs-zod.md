# Рефакторинг контрактов shared + переход на nestjs-zod

## Контекст

В `packages/shared` сейчас сосуществуют две конвенции именования. `category.ts` использует
суффикс `Dto` на выводимых типах (`CreateCategoryDto`, `CategoryResponseDto`), а `auth.ts` /
`user.ts` / `health.ts` — голые доменные имена (`RegisterRequest`, `PublicUser`,
`HealthResponse`). Плюс входные схемы в auth помечаются инфиксом `Request`
(`registerRequestSchema`), а в category — глаголом-префиксом (`createCategorySchema`).

Одновременно в бэкенде валидация держится на самописном `common/pipes/zod-validation.pipe.ts`,
который приходится вручную навешивать на каждый `@Body(new ZodValidationPipe(schema))`.
В `main.ts` при этом зарегистрирован глобальный `ValidationPipe` из class-validator, который
не валидирует ничего — DTO-классов в проекте нет, — то есть это мёртвый код вместе с
зависимостями `class-validator` / `class-transformer`.

Цель: привести всё именование к конвенции category, перевести валидацию на `nestjs-zod`, а
DTO-классы (`createZodDto`) разместить в самих модулях (`category/dto/create-category.dto.ts`).

## Решения (согласованы с пользователем)

- Именование: `<verb><Entity>Schema` / `<Verb><Entity>Dto` — как в category.
- zod-схемы остаются единственным источником правды в `packages/shared`.
- DTO-классы на `createZodDto` живут в `apps/backend/src/<module>/dto/` и именуются с
  постфиксом `Class`: `CreateCategoryDtoClass`.
- DTO-классы делаются и для входных, и для response-схем.
- `publicUserSchema` / `PublicUser` → `userResponseSchema` / `UserResponseDto`.
- Глобальный `ZodValidationPipe` из nestjs-zod заменяет и самописный pipe, и class-validator.
- Ответы сериализуются через `@ZodSerializerDto(XxxResponseDtoClass)` + глобальный
  `ZodSerializerInterceptor`, а не ручным `schema.parse()` в контроллерах и хендлерах.

## 1. Переименование в `packages/shared/src`

`user.ts`:

| было               | стало                |
| ------------------ | -------------------- |
| `publicUserSchema` | `userResponseSchema` |
| `PublicUser`       | `UserResponseDto`    |

`auth.ts`:

| было                                        | стало                                    |
| ------------------------------------------- | ---------------------------------------- |
| `registerRequestSchema` / `RegisterRequest` | `registerSchema` / `RegisterDto`         |
| `loginRequestSchema` / `LoginRequest`       | `loginSchema` / `LoginDto`               |
| `refreshRequestSchema` / `RefreshRequest`   | `refreshSchema` / `RefreshDto`           |
| `authTokensSchema` / `AuthTokens`           | `authTokensSchema` / `AuthTokensDto`     |
| `authResponseSchema` / `AuthResponse`       | `authResponseSchema` / `AuthResponseDto` |

`health.ts`: `healthResponseSchema` остаётся, `HealthResponse` → `HealthResponseDto`.

`category.ts`: имена уже верны — менять нечего. Заодно экспортировать `colorSchema`
(сейчас module-private, фронт не может переиспользовать regex цвета).

`index.ts`: обновить устаревший doc-комментарий («this file only carries the health
contract») — реэкспортируются четыре модуля.

Дублирующийся блок `createdAt` (union `z.date() | z.iso.datetime()` + transform в ISO) сейчас
побайтово скопирован в `user.ts` и `category.ts`. Вынести в `src/common.ts` как
`isoDateSchema` и переиспользовать в обоих — иначе третий домен скопирует его в третий раз.

## 2. Зависимости

В `apps/backend/package.json`:

- добавить `nestjs-zod` (версия под zod 4 — проверить `pnpm view nestjs-zod` перед установкой,
  нужна линия с поддержкой zod v4);
- удалить `class-validator` и `class-transformer` — после шага 4 их не использует ничего.

`pnpm install` из корня.

## 3. DTO-классы в модулях

Новые файлы, каждый — одна строка обёртки над схемой из shared:

```ts
// apps/backend/src/category/dto/create-category.dto.ts
import { createZodDto } from 'nestjs-zod';
import { createCategorySchema } from '@expense-tracker/shared';

export class CreateCategoryDtoClass extends createZodDto(createCategorySchema) {}
```

Тот же шаблон повторяется для всех схем:

- `category/dto/`: `create-category.dto.ts`, `update-category.dto.ts`,
  `category-response.dto.ts`, `category-list-response.dto.ts`
- `auth/dto/`: `register.dto.ts`, `login.dto.ts`, `refresh.dto.ts`, `auth-response.dto.ts`
- `user/dto/`: `user-response.dto.ts`

Response-классы здесь не декоративные: именно они передаются в `@ZodSerializerDto(...)` на
шаге 4, то есть являются рабочим механизмом сериализации ответа (и заодно готовы под Swagger).

## 4. Валидация и сериализация

**Вход.** `apps/backend/src/main.ts`:

- убрать `ValidationPipe` из `@nestjs/common`;
- поставить `app.useGlobalPipes(new ZodValidationPipe())` из `nestjs-zod`.

Удалить `apps/backend/src/common/pipes/zod-validation.pipe.ts` (и папку `common/pipes`, если
она останется пустой).

Контроллеры (`auth/auth.controller.ts`, `category/category.controller.ts`): инлайновый
`@Body(new ZodValidationPipe(schema))` заменяется на голый `@Body() body: XxxDtoClass` —
глобальный pipe читает схему из метаданных класса.

**Выход.** Зарегистрировать `ZodSerializerInterceptor` глобально в `app.module.ts` (он
инжектит `Reflector`, поэтому идёт провайдером, а не `app.useGlobalInterceptors`):

```ts
providers: [
  AppService,
  { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
],
```

Каждый роут, отдающий тело, помечается `@ZodSerializerDto(XxxResponseDtoClass)`:

```ts
@Get()
@ZodSerializerDto(CategoryListResponseDtoClass)
findAll(@CurrentUser() user: UserResponseDto): Promise<Category[]> {
  return this.queryBus.execute(new GetCategoriesQuery(user.id));
}
```

Ручные `.parse()` при этом убираются:

- из контроллеров — `categoryResponseSchema.parse(...)`, `categoryListResponseSchema.parse(...)`;
- из хендлеров — `authResponseSchema.parse({ user, tokens })` в `register/login/refresh.handler.ts`;
  хендлер возвращает объект, интерцептор сериализует.

Что `.parse()` **сохраняется**: `publicUserSchema.parse` (→ `userResponseSchema.parse`) в
`jwt.strategy.ts` — это разбор входящего JWT-payload, а не ответ, интерцептор туда не достаёт.
`healthResponseSchema.parse` в `app.service.ts` переводим на
`@ZodSerializerDto(HealthResponseDtoClass)` в `app.controller.ts` — ради единообразия.

Два следствия, которые стоит держать в голове:

1. `createdAt` трансформируется (`Date` → ISO-строка) теперь внутри интерцептора. Тип
   возврата хендлера — Prisma-модель с `Date`, а наружу уходит строка; это нормально, но
   означает, что аннотация возврата контроллера и фактический JSON расходятся по типу
   `createdAt`. Аннотировать возврат `Promise<Category>` (Prisma-тип), а контрактом наружу
   считать response-DtoClass.
2. Формат тела ошибки 400 изменится (`ZodValidationException` вместо `z.treeifyError`), а
   сбой сериализации даст 500 `ZodSerializationException`. Фронт это сейчас не читает —
   ломать нечего, но факт фиксируем.

## 5. Обновление точек использования

Переименования затрагивают (полный список даёт
`grep -rn "PublicUser\|AuthResponse\|RegisterRequest\|LoginRequest\|RefreshRequest\|AuthTokens\|HealthResponse\|publicUserSchema" apps`):

- `auth/`: `token.service.ts`, `strategies/jwt.strategy.ts`, `decorators/current-user.decorator.ts`,
  все четыре `commands/*.command.ts` и `commands/handlers/*.handler.ts`
- `category/`: `category.controller.ts`, `commands/update-category.command.ts`
- корень: `app.controller.ts`, `app.service.ts`
- фронт: `apps/web/src/app/page.tsx` (`HealthResponse` → `HealthResponseDto`)
- `apps/backend/test/app.e2e-spec.ts` — если ссылается на переименованные типы

Помнить про constraint из CLAUDE.md: инжектируемые в конструктор параметры — только value-импорты,
никогда `import { type Foo }`. DTO-классы в сигнатурах `@Body()` — это тип параметра, а не
инъекция, но `createZodDto`-классы нужны как значения в рантайме для метаданных, поэтому
импортировать их без `type`.

## Todo

### Шаг 1 — shared

- [x] `packages/shared/src/common.ts`: вынести `isoDateSchema` (union date/iso + transform)
- [x] `user.ts`: `publicUserSchema` → `userResponseSchema`, `PublicUser` → `UserResponseDto`, использовать `isoDateSchema`
- [x] `auth.ts`: переименовать 5 пар схема/тип по таблице шага 1
- [x] `health.ts`: `HealthResponse` → `HealthResponseDto`
- [x] `category.ts`: экспортировать `colorSchema`, использовать `isoDateSchema`
- [x] `index.ts`: добавить `export * from './common'`, обновить устаревший doc-комментарий
- [x] `pnpm --filter @expense-tracker/shared build`

### Шаг 2 — зависимости

- [x] `pnpm view nestjs-zod` — выбрать версию с поддержкой zod v4
- [x] `apps/backend/package.json`: добавить `nestjs-zod`, удалить `class-validator` и `class-transformer`
- [x] `pnpm install` из корня

### Шаг 3 — DTO-классы

- [x] `category/dto/`: `create-category.dto.ts`, `update-category.dto.ts`, `category-response.dto.ts`, `category-list-response.dto.ts`
- [x] `auth/dto/`: `register.dto.ts`, `login.dto.ts`, `refresh.dto.ts`, `auth-response.dto.ts`
- [x] `user/dto/user-response.dto.ts`
- [x] `app/dto` или рядом с `app.controller.ts`: `health-response.dto.ts`

### Шаг 4 — валидация и сериализация

- [x] `main.ts`: снять class-validator `ValidationPipe`, поставить `ZodValidationPipe` из nestjs-zod
- [x] `app.module.ts`: зарегистрировать `ZodSerializerInterceptor` через `APP_INTERCEPTOR`
- [x] удалить `common/pipes/zod-validation.pipe.ts` (и пустую папку `common/pipes`)
- [x] `auth.controller.ts`: `@Body() body: XxxDtoClass` + `@ZodSerializerDto(AuthResponseDtoClass)` на register/login/refresh
- [x] `category.controller.ts`: то же + `@ZodSerializerDto` на findAll/create/update, убрать `.parse()`
- [x] `app.controller.ts`: `@ZodSerializerDto(HealthResponseDtoClass)`, убрать `.parse()` из `app.service.ts`
- [x] убрать `authResponseSchema.parse(...)` из `register/login/refresh.handler.ts`

### Шаг 5 — точки использования

- [x] `auth/`: `token.service.ts`, `jwt.strategy.ts`, `current-user.decorator.ts`, все `commands/*` и `handlers/*`
- [x] `category/commands/update-category.command.ts`
- [x] `app.controller.ts` / `app.service.ts`
- [x] `apps/web/src/app/page.tsx`
- [x] `apps/backend/test/app.e2e-spec.ts` — если задет переименованиями

### Проверка

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [ ] ручная проверка curl-ами (см. ниже) — требует `pnpm db:up && pnpm dev`, не выполнялась

## Verification

```bash
pnpm --filter @expense-tracker/shared build   # consumers читают dist, не src
pnpm typecheck
pnpm lint
```

`pnpm typecheck` — основная сеть безопасности: любое пропущенное переименование всплывёт
как ошибка резолва. Тесты не трогаем (out of scope по CLAUDE.md).

Ручная проверка рантайма, если поднята БД (`pnpm db:up && pnpm dev`):

```bash
curl -i -X POST localhost:3001/api/auth/register \
  -H 'content-type: application/json' -d '{"email":"not-an-email"}'   # ждём 400
curl -i -X POST localhost:3001/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"a@b.c","name":"A","password":"password123"}'          # ждём 201 + токены
```

Второй запрос подтверждает, что глобальный pipe пропускает валидное тело и `createZodDto`
корректно отдаёт схему. В его ответе отдельно проверить сериализацию: `user.createdAt` —
ISO-строка, а не объект даты, и в `user` нет `passwordHash` (интерцептор обрезает поля,
которых нет в `userResponseSchema`). Затем с полученным access-токеном:

```bash
curl -s localhost:3001/api/categories -H "authorization: Bearer $TOKEN"
```

— массив должен пройти через `CategoryListResponseDtoClass` без 500-й
`ZodSerializationException`.
