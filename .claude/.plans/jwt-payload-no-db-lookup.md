# Рефакторинг: JWT-валидация без похода в БД

## Контекст

Сейчас `JwtStrategy.validate()` (`apps/backend/src/auth/strategies/jwt.strategy.ts`) на **каждый
запрос** дёргает `GetUserByIdQuery` → `UserRepository.findById` → Postgres, хотя единственное,
что ему нужно от БД, — это данные, которые мы и так знаем в момент выпуска токена. Payload
сегодня минимальный: `{ sub, email }`.

Цель — положить в access-токен весь «безопасный» профиль юзера единым объектом `user` и
собирать `request.user` прямо из payload, убрав запрос к БД из горячего пути аутентификации.
`sub` при этом уходит: `user.id` делает его избыточным.

**Принятый компромисс:** access-токен становится самодостаточным. Отзыв доступа перестаёт быть
мгновенным — удалённый или переименованный юзер сохраняет валидный токен со старыми данными до
истечения TTL (по умолчанию `JWT_ACCESS_EXPIRES_IN=15m`). Это ограничено коротким TTL, а
`refresh` по-прежнему ходит в БД и подтянет свежего юзера (или упадёт 401, если юзера нет).

## Ключевая проблема, которую надо решить в первую очередь

`publicUserSchema` (`packages/shared/src/user.ts`) **не может распарсить собственный вывод**:

```ts
createdAt: z.date().transform((date) => date.toISOString()),
```

На входе она требует `Date`, на выходе даёт `string`. Из JWT `createdAt` придёт именно строкой
(JSON не имеет типа Date), поэтому `publicUserSchema.parse(payload.user)` в стратегии
**упадёт**. Просто переиспользовать существующую схему для payload нельзя — это тихая ловушка,
на которой рефакторинг развалится в рантайме, а не на `typecheck`.

Побочно это же ломает изначально задуманный сценарий «фронтенд re-парсит ответ той же схемой»
(см. CLAUDE.md — контракт как общий источник истины).

## Решение

### 1. `packages/shared/src/user.ts` — сделать схему идемпотентной

Принять и `Date`, и ISO-строку, на выходе всегда строка. Так одна схема обслуживает три
сценария: парс Prisma-строки (`Date`), парс JWT-payload (`string`), парс HTTP-ответа на фронте
(`string`).

```ts
export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: z
    .union([z.date(), z.iso.datetime()])
    .transform((value) => (value instanceof Date ? value.toISOString() : value)),
});
```

`PublicUser` (инферится из output) остаётся прежним — `createdAt: string`, так что
`CurrentUser`, `authResponseSchema` и контроллеры не меняются.

Точное написание проверки ISO-строки уточнить по установленной версии zod v4 (`z.iso.datetime()`
против `z.string().datetime()`) — на суть плана это не влияет.

### 2. `apps/backend/src/auth/token.service.ts` — payload с юзером

Переопределить payload и подпись. `sub` **убираем**: он дублировал бы `user.id`, а второго
источника истины для идентификатора юзера в токене быть не должно — при расхождении сразу
возникает вопрос, кому верить. Единственный потребитель `sub` сегодня — `JwtStrategy.validate()`
(`payload.sub`), и он в п.4 переписывается на `payload.user`, так что внешних завязок нет.

```ts
export interface AccessTokenPayload {
  user: PublicUser;
}
```

- Сигнатура `issueTokens(userId: string, email: string)` меняется на
  `issueTokens(user: PublicUser)` (или на приём Prisma-`User` с парсом внутри — см. п.3).
- Внутри: `signAccessToken({ user }, accessExpiresInSeconds)`, а
  `refreshTokenRepository.create({ ..., userId: user.id })`.
- `PublicUser` импортируется как `import { type PublicUser }` — это не инжектируемый параметр,
  type-only здесь корректен (см. CLAUDE.md про `emitDecoratorMetadata`).

Важно: в payload не должно быть `passwordHash`/`updatedAt`. Гарантия — прогон через
`publicUserSchema.parse()` (плоский `z.object` их отбрасывает), а не ручной pick.

### 3. Три вызывающих хендлера — привести к новой сигнатуре

`apps/backend/src/auth/commands/handlers/{register,login,refresh}.handler.ts` — все три
сегодня делают `issueTokens(user.id, user.email)`, имея на руках полный Prisma-`User`, и следом
`authResponseSchema.parse({ user, tokens })`.

Чтобы не парсить юзера дважды, в каждом хендлере парсим один раз и переиспользуем:

```ts
const publicUser = publicUserSchema.parse(user);
const tokens = await this.tokenService.issueTokens(publicUser);

return { user: publicUser, tokens };
```

Возврат `authResponseSchema.parse(...)` при этом можно сохранить (обе части уже валидны,
парс идемпотентен после п.1) — решение по вкусу; главное, что `issueTokens` получает уже
провалидированный `PublicUser`.

### 4. `apps/backend/src/auth/strategies/jwt.strategy.ts` — убрать БД

Ради чего всё затевалось. `QueryBus` и `GetUserByIdQuery` уходят из импортов и конструктора,
`validate` становится синхронным:

```ts
validate(payload: AccessTokenPayload): PublicUser {
  return publicUserSchema.parse(payload.user);
}
```

Парс оставляем: он нормализует `createdAt` через ту же схему, что и остальной код, и держит
`request.user` строго в контракте `PublicUser`, если payload и схема когда-нибудь разъедутся.

`ConfigService` в конструкторе остаётся (нужен для `secretOrKey`).

## Затрагиваемые файлы

| Файл                                               | Что меняется                                           |
| -------------------------------------------------- | ------------------------------------------------------ |
| `packages/shared/src/user.ts`                      | схема принимает `Date` \| ISO-строку                   |
| `apps/backend/src/auth/token.service.ts`           | `AccessTokenPayload`, `issueTokens`, `signAccessToken` |
| `apps/backend/src/auth/strategies/jwt.strategy.ts` | убрать `QueryBus`, парсить payload                     |
| `.../commands/handlers/register.handler.ts`        | новая сигнатура `issueTokens`                          |
| `.../commands/handlers/login.handler.ts`           | то же                                                  |
| `.../commands/handlers/refresh.handler.ts`         | то же                                                  |

Не меняются: `auth.module.ts` (провайдеры те же), `jwt-auth.guard.ts`,
`current-user.decorator.ts`, `auth.controller.ts`, `user/**`, схема Prisma, миграции.

`GetUserByIdQuery` остаётся в проекте — им продолжает пользоваться `refresh.handler.ts`.

## Побочный эффект, который стоит учесть

Размер access-токена вырастет: добавятся `name` и `createdAt`, а поля уедут внутрь вложенного
`user` (отказ от `sub` часть этого прироста компенсирует). Грубая оценка — со ~180 до ~300 байт,
точное значение видно при декодировании токена. Для заголовка `Authorization` это некритично, но
при будущем переезде токена в cookie об этом стоит помнить.

## Проверка

Тесты вне скоупа (см. CLAUDE.md), проверяем статикой + руками:

```bash
pnpm typecheck    # поймает несогласованные сигнатуры issueTokens во всех трёх хендлерах
pnpm lint
```

Затем end-to-end вручную (нужен поднятый Postgres: `pnpm db:up`, `pnpm db:generate`, `pnpm dev`):

1. `POST /api/auth/register` → скопировать `tokens.accessToken`, декодировать payload и
   убедиться, что в нём есть `user` с `id/email/name/createdAt` и **нет** `passwordHash`.
2. `POST /api/auth/login` тем же юзером → токен содержит такой же `user`.
3. `POST /api/auth/refresh` с полученным refresh-токеном → приходит новая пара, access-токен
   снова с полным `user`. Поход в БД здесь ожидаемо остаётся.

Защищённых `JwtAuthGuard`-ом маршрутов в проекте пока нет, и заводить их ради проверки не
будем — новая `validate()` синхронная и без зависимостей, так что первый реальный защищённый
маршрут и станет её проверкой. Отсутствие запроса к БД на аутентификации к этому моменту
гарантируется тем, что `QueryBus` из стратегии удалён физически.
