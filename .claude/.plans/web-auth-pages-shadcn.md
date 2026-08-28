# Страницы регистрации и логина во фронтенде (shadcn/ui)

## Контекст

Бэкенд уже содержит рабочий auth-стек (`/api/auth/register|login|refresh|logout`), а
`apps/web` — пустой скаффолд Next.js: в `src/` только `app/globals.css`, `app/layout.tsx`
и `app/page.tsx` (health-заглушка). UI-библиотеки нет вообще.

Задача — добавить страницы регистрации и входа поверх существующего API на shadcn/ui и
замкнуть цикл: регистрация/вход → защищённая страница → выход.

**Бэкенд не меняем.** Всё реализуемо поверх текущего API.

## Решения (согласованы с пользователем)

1. **httpOnly-куки через Route Handlers** — формы шлют данные в Next Route Handlers, те
   ходят в Nest server-side и кладут токены в httpOnly-куки. Токены не попадают в JS.
2. **shadcn ставим строго по документации** (`shadcn init`). Текущая тема в `globals.css`
   расходуемая — её токены (`--color-surface/--color-ink/--color-accent`) удаляются, чтобы
   не было конфликтов. Тёмную тему возвращаем через **next-themes** с переключателем.
3. **Внутри Next не re-парсим zod-схемами** ответы и тела, которые уже валидирует бэкенд.
   zod остаётся только для валидации форм в react-hook-form. CLAUDE.md правим под это.
4. **`tokens.expiresIn` не используем** (в будущем будет удалён). `maxAge` для access-куки
   считаем из `exp` декодированного токена через **jwt-decode**; для refresh-куки берём
   `JWT_REFRESH_EXPIRES_IN` из общего корневого `.env`.
5. **Проактивный refresh**: если access-токену осталось жить меньше 30 секунд — обновляем
   заранее и ставим новые куки, чтобы в серверные компоненты никогда не пришёл протухший
   токен (из них поставить куку нельзя). Дедупликация одновременных refresh — через
   модульный `Map<refreshToken, Promise>`.
6. **`/api/auth/refresh` — публичный route handler**, а не логика внутри `proxy.ts`.
   Refresh может понадобиться и с клиентской стороны, поэтому единственная реализация
   живёт в handler'е, а `proxy.ts` ходит в него как обычный клиент.
7. **Редирект на защищённый `/dashboard`** с данными пользователя и кнопкой выхода.

## Проверенные факты, влияющие на реализацию

| Факт                                                                                                                                                     | Следствие                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| В Next 16.3.3 `middleware.ts` — **Edge**, в его config-схеме (`middleware-config.d.ts`) **нет ключа `runtime`**                                          | Модульный `Map` там ненадёжен. Пишем **`src/proxy.ts`** — преемник middleware, всегда Node.js (ошибка E1031 «Proxy always runs on Node.js runtime») |
| Refresh-токен — `randomBytes(32).toString('hex')` (`token.service.ts:65`), **не JWT**                                                                    | У него **нет декодируемого `exp`**. jwt-decode применим только к access-токену                                                                      |
| Access-JWT содержит **весь объект user** (`AccessTokenPayload = { user: UserResponseDto }`, `token.service.ts:29`)                                       | `/me` на бэкенде **нет и не нужен** — пользователя берём из payload через jwt-decode                                                                |
| Бэкенд валидирует тела глобальным `ZodValidationPipe` (`main.ts:14`) теми же `registerSchema`/`loginSchema` из `packages/shared` (`dto/register.dto.ts`) | Повторный `.parse()` в route handler — строго лишняя работа. Обоснование решения (3)                                                                |
| Ответы гарантированы `@ZodResponse({ type: AuthResponseDtoClass })` на всех auth-роутах                                                                  | Ответ можно типизировать `as AuthResponseDto` без парса                                                                                             |
| `login` и `refresh` возвращают **201**, не 200 (только `logout` имеет `@HttpCode`)                                                                       | Ветвиться на `res.ok`, никогда на `res.status === 200`                                                                                              |
| Refresh-токены **ротируются** (`redeemRefreshToken` отзывает предъявленный)                                                                              | После refresh переписывать **обе** куки, иначе следующий refresh даст 401                                                                           |
| Next читает только `apps/web/.env*`; корневой `.env` бэкенду виден лишь потому, что Nest (`envFilePath: ['.env','../../.env']`) и Prisma грузят его явно | Грузим корневой `.env` явно в `next.config.ts` через dotenv — тот же приём, что в `prisma.config.ts`                                                |
| `cookies()` в Next 16.3.3 возвращает `Promise`                                                                                                           | Всегда `await cookies()`                                                                                                                            |
| В Server Component `cookies()` **read-only**, `.set()` бросает                                                                                           | Refresh в рендере страницы **невозможен** — отсюда решение (5)                                                                                      |
| `strict` + `noUncheckedIndexedAccess` в `packages/tsconfig/base.json`                                                                                    | `jwtDecode<T>()` — это assertion, а не валидация: нужен `try/catch` + проверка `typeof exp === 'number'`                                            |
| zod есть только в `packages/shared`; `react-hook-form`, `@hookform/resolvers`, `jwt-decode` не установлены                                               | pnpm строгий — всё нужное объявляем прямой зависимостью `apps/web`                                                                                  |
| Компоненты shadcn **не** в ignore-списках ESLint/Prettier; husky гоняет `eslint --fix` на pre-commit                                                     | После `shadcn add` обязательно `pnpm format` + `pnpm lint`, иначе коммит упадёт                                                                     |
| Бэкенд читает токен из заголовка `Authorization: Bearer` (`jwt.strategy.ts`)                                                                             | Будущие защищённые запросы — читать access-куку и класть в заголовок вручную                                                                        |

`packages/shared` **не трогаем**: `expiresIn` остаётся в `authTokensSchema` (его требует
`@ZodResponse` на бэкенде), мы просто перестаём его читать на фронте.

## 1. Зависимости и env

```bash
cd apps/web
pnpm add jwt-decode react-hook-form @hookform/resolvers zod next-themes
pnpm add -D dotenv
```

Остальное (`class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`,
`lucide-react`, `@radix-ui/*`) поставит сам `shadcn init` / `shadcn add`.

**Все команды shadcn запускать из `apps/web`, не из корня.** CLI ищет `package.json`
вверх по дереву и в монорепо может записать зависимости в корневой — при строгом pnpm они
оттуда не зарезолвятся, и падение будет не на install, а на сборке. После init обязательно
проверить `git diff` корневого `package.json`.

`next.config.ts` — подгрузить корневой `.env` (значения нужны только на сервере):

```ts
import { config as loadEnv } from 'dotenv';

// Next читает только apps/web/.env*, а JWT_REFRESH_EXPIRES_IN живёт в общем корневом .env
// (тот же приём, что в apps/backend/prisma.config.ts).
loadEnv({ path: '../../.env' });
```

Новых переменных не заводим: `JWT_REFRESH_EXPIRES_IN` и `NEXT_PUBLIC_API_URL` уже есть в
`.env.example` и в `turbo.json` → `build.env`. `NODE_ENV` уже в `globalEnv`.

## 2. shadcn init по документации

```bash
cd apps/web && pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label card form
```

`init` перезапишет `globals.css` своими токенами (`--background`/`--foreground`/…),
создаст `components.json`, `src/lib/utils.ts` (`cn`) и `src/components/ui/`. Это
санкционировано решением (2).

Если CLI создаст `tailwind.config.js` — удалить: в Tailwind v4 конфиг живёт в CSS
(`components.json` → `"tailwind": { "config": "" }`).

**Тёмная тема.** `init` заменит текущий `@media (prefers-color-scheme: dark)` на классовый
`@custom-variant dark (&:is(.dark *))`. Пока на `<html>` нет класса `.dark`, тёмная тема
просто не работает — это выглядит как «shadcn сломался». Поэтому ставим `next-themes`:

- `src/components/theme-provider.tsx` — клиентская обёртка над `ThemeProvider`.
- `layout.tsx`: `<html lang="en" suppressHydrationWarning>`, внутри — провайдер с
  `attribute="class"`, `defaultTheme="system"`, `enableSystem`.
  `suppressHydrationWarning` обязателен: next-themes дописывает класс до гидратации.
- `src/components/theme-toggle.tsx` — переключатель на `DropdownMenu` (`shadcn add
dropdown-menu`) со `Sun`/`Moon` из lucide.

После генерации: `pnpm format && pnpm lint` (см. таблицу фактов про husky).

## 3. Миграция `page.tsx`

Существующие произвольные значения заменяются токенами shadcn:

| Было                                     | Стало                                 |
| ---------------------------------------- | ------------------------------------- |
| `text-[var(--color-ink-muted)]`          | `text-muted-foreground`               |
| `bg-[var(--color-surface-muted)]`        | `bg-muted`                            |
| `border-black/10 dark:border-white/10`   | `border-border`                       |
| `text-[var(--color-accent)]` (статус ok) | `text-primary` — **не** `text-accent` |

`--accent` у shadcn — бледная hover-поверхность, а не брендовый зелёный: `text-accent`
дал бы почти невидимый текст. Блок `<section>` естественно переписывается на `Card`.

Там же по решению (3) убрать `healthResponseSchema.parse(...)` → `as HealthResponseDto`.

## 4. Route Handlers (`src/app/api/auth/`)

| Файл                | Логика                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `register/route.ts` | тело `as RegisterDto` → POST на бэкенд → при `!res.ok` проксировать статус и сообщение → при успехе поставить куки, вернуть `{ ok: true }`              |
| `login/route.ts`    | то же с `LoginDto`                                                                                                                                      |
| `refresh/route.ts`  | взять refresh-куку **из запроса** (тело не читаем) → `refreshOnce()` → поставить обе куки, вернуть `{ ok: true }`; при провале — снять обе куки и `401` |
| `logout/route.ts`   | прочитать refresh-куку, POST `/api/auth/logout` в try/catch, удалить обе куки                                                                           |

`.parse()` не делаем (решение 3) — но `await request.json()` сам бросает на невалидном
JSON, поэтому он обязан быть в `try/catch` с ответом 400. Иначе кривое тело даст 500.

### `refresh/route.ts` — единственная реализация refresh (решение 6)

Он публичный: в него ходит и `proxy.ts`, и клиентский код (например, интерсептор `fetch`,
когда защищённый запрос получил 401). Поэтому вся логика обновления живёт здесь, а не в
`proxy.ts`.

- **Refresh-токен берём из куки запроса, а не из тела.** Кука `httpOnly`, клиентский JS её
  не прочитает и передать в теле не сможет. Тело игнорируем полностью — тогда у handler'а
  один источник истины и нет способа подсунуть чужой токен.
- Ответ клиенту — `{ ok: true }` **без токенов** (решение 1). Клиенту достаточно факта
  успеха: новые куки уже стоят в `Set-Cookie`, и следующий его запрос уйдёт с ними.
- При провале — `401` и удаление **обеих** кук. Клиент по 401 отправляет пользователя на
  `/login`. Не удалить куки здесь — тот же вечный цикл, что и в случае 5 таблицы §6.
- CSRF: куки `SameSite=Lax`, а роут `POST` — межсайтовая форма его не вызовет. Отдельный
  токен не заводим.

Куки — общие опции в `src/lib/auth/cookies.ts`:

```ts
{ httpOnly: true, secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax', path: '/', maxAge }
```

- `access_token`: `maxAge` = `exp - now` из jwt-decode (решение 4), **не** `expiresIn`.
- `refresh_token`: `maxAge` = `JWT_REFRESH_EXPIRES_IN` из корневого `.env`, распарсенный
  хелпером `parseDuration('7d') → 604800` (по образцу `parseDurationMs` в
  `token.service.ts`; не импортируем с бэкенда — импорт backend → web некорректен).
- `lax`, не `strict`: иначе переход по внешней ссылке всегда выкидывает на логин.
- `secure` только в проде — иначе на `http://localhost` куки молча не ставятся.

**Ответ клиенту не содержит токенов** — только `{ ok: true }` или `{ message }`.

## 5. `src/lib/auth/token.ts` — декод

Один хелпер на `proxy.ts` и `session.ts`, дублировать нельзя:

```ts
import { jwtDecode } from 'jwt-decode'; // именованный экспорт

interface AccessTokenClaims {
  user: UserResponseDto;
  iat: number;
  exp: number;
}

export function decodeAccessToken(token: string): AccessTokenClaims | null {
  try {
    const claims = jwtDecode<AccessTokenClaims>(token);
    // Дженерик jwtDecode — это assertion, а не валидация: exp проверяем руками.
    if (typeof claims.exp !== 'number') return null;
    return claims;
  } catch {
    return null; // InvalidTokenError на битом токене
  }
}

export function secondsUntilExpiry(token: string): number | null { ... }
```

Подпись здесь **не проверяется**, и это осознанно: `proxy.ts` — не граница авторизации, а
лишь планировщик refresh. Настоящую проверку делает `JwtAuthGuard` на бэкенде. Нужен
комментарий, иначе читается как дыра.

В `packages/shared` это не кладём: там zod-контракты, а `jwt-decode` утянулся бы в сборку
Nest, которому небезопасный декод не нужен вовсе.

`src/lib/session.ts` → `getSession()` читает access-куку и возвращает `claims.user`.
**Намеренно не рефрешит**: `cookies()` в Server Component read-only, и refresh отсюда
отозвал бы старый токен, не сумев сохранить новый — пользователя выкинуло бы навсегда.
Обязательный комментарий в коде.

## 6. Дедупликация и `src/proxy.ts`

### `src/lib/auth/refresh.ts` — общий `refreshOnce()`

Модуль импортируют **и** `refresh/route.ts`, **и** `proxy.ts`. Держать `Map` внутри
`proxy.ts` нельзя: клиентские refresh идут в handler мимо proxy и прошли бы мимо
дедупликации — а параллельные запросы создаёт как раз клиент.

```ts
const inFlight = new Map<string, Promise<RefreshOutcome>>();

type RefreshOutcome = { ok: true; accessToken: string; refreshToken: string } | { ok: false };

export function refreshOnce(refreshToken: string): Promise<RefreshOutcome>;
```

`refreshOnce` ходит **на бэкенд** (`POST ${API_URL}/api/auth/refresh`), а не в свой же
route handler — иначе handler вызывал бы сам себя.

- Ключ — предъявленный refresh-токен, значение — **промис**, а не результат: второй
  запрос дожидается того же промиса и получает ту же пару токенов, не предъявляя
  отозванный токен повторно.
- Промис **не должен реджектиться**: провал моделируем как `{ ok: false }`. Общий
  реджект уронил бы всех ожидающих, а необработанный — процесс.
- `.finally(() => inFlight.delete(key))` обязателен именно из-за ротации: после успеха
  ключ мёртв навсегда, и запись обязана исчезнуть.
- На `fetch` — `AbortSignal.timeout(5000)`. Это гарантирует, что промис всегда
  завершится, а значит `finally` отработает и ключ не утечёт.

Границы применимости — комментарием в файле: Map спасает только одновременные запросы
внутри одного процесса. Запрос, уже ушедший в сеть со старой кукой, всё равно предъявит
отозванный токен и получит 401 → чистый разлогин. Это принято (один инстанс Node), и по
этой же причине ветка 401 обязана быть корректной, а не «случайно рабочей»: в dev HMR
сбрасывает Map, так что дедупликация там фактически не проверяется.

Постановку кук `refresh/route.ts` и `proxy.ts` делают каждый сам (у них разные объекты
ответа), поэтому опции берут из общего `src/lib/auth/cookies.ts` — см. §4.

### `src/proxy.ts`

Именно `proxy.ts`, а не `middleware.ts`: только он гарантированно на Node.js, где
модульный `Map` переживает запросы.

Proxy **ходит в свой route handler** `POST /api/auth/refresh` (решение 6), передавая
куки запроса, и переносит `Set-Cookie` из его ответа в свой. Так у обновления один
исполнитель, а `proxy.ts` остаётся тонким. Схлопывание одновременных вызовов при этом
всё равно происходит — в `refreshOnce()` внутри handler'а.

### Таблица решений

Порог `REFRESH_THRESHOLD_SECONDS = 30`.

| #   | access                    | refresh | Действие      | Ответ                                 | Куки            |
| --- | ------------------------- | ------- | ------------- | ------------------------------------- | --------------- |
| 1   | нет                       | нет     | —             | защищённый → `/login`; иначе `next()` | —               |
| 2   | валиден, `exp - now > 30` | любой   | —             | `next()`                              | —               |
| 3   | валиден, `≤ 30`           | есть    | `refreshOnce` | `next({ request })`                   | обе, новые      |
| 4   | нет / протух              | есть    | `refreshOnce` | `next({ request })`                   | обе, новые      |
| 5   | случаи 3–4, refresh → 401 | —       | —             | защищённый → `/login`; иначе `next()` | обе **удалить** |
| 6   | битый / не декодируется   | есть    | как случай 4  | `next({ request })`                   | обе, новые      |
| 7   | битый / не декодируется   | нет     | как случай 1  | защищённый → `/login`                 | обе **удалить** |

Случай 5 обязан удалять куки, иначе — вечный цикл редиректов: протухшая кука убеждает
proxy, что refresh возможен, refresh даёт 401, и так на каждый запрос. Случай 6 важен:
битый access при живом refresh должен **лечиться**, а не разлогинивать.

### Две куки-«банки» — ключевой момент

Proxy вызывает свой handler и разбирает его ответ:

```ts
const refreshRes = await fetch(new URL('/api/auth/refresh', request.url), {
  method: 'POST',
  headers: { cookie: request.headers.get('cookie') ?? '' }, // куки вручную: fetch их не тянет
});
```

Дальше при успехе пишем в **оба** места:

```ts
// (i) — чтобы новые токены увидел серверный компонент ЭТОГО ЖЕ запроса
request.cookies.set(ACCESS_COOKIE, accessToken);
request.cookies.set(REFRESH_COOKIE, refreshToken);
const response = NextResponse.next({ request }); // (ii)

// (iii) — чтобы браузер сохранил куки на будущее: переносим Set-Cookie из ответа handler'а
for (const cookie of refreshRes.headers.getSetCookie()) {
  response.headers.append('set-cookie', cookie);
}
```

- (i)+(ii) — ради этого всё и затевалось: `cookies()` в Server Component read-only, и
  протухший токен там неисправим.
- (iii) — без этого каждый запрос рефрешил бы заново, сжигая по refresh-токену на ротации.

Одно без другого не работает. Для (i) нужны сами значения токенов, а тело ответа их не
содержит — распарсить их надо из тех же `Set-Cookie` (`getSetCookie()` даёт массив строк,
имя/значение берётся до первой `;`). Альтернатива, если парсинг покажется хрупким:
`refreshOnce()` вызывается в proxy напрямую (модуль общий), а handler остаётся для
клиента. Тогда (i) тривиально, но обновление живёт в двух вызывающих местах — выбрать при
реализации, поведение одинаковое.

Matcher: `['/dashboard/:path*', '/login', '/register']`. Широкий negative-lookahead
**нельзя**: proxy перехватил бы собственный запрос к `/api/auth/refresh` — это прямая
рекурсия, — а заодно молотил бы на `_next/static`, увеличивая шанс гонки. Любой вариант
matcher'а обязан исключать `/api/auth/*`. На `/login`/`/register` при валидной сессии —
редирект на `/dashboard`.

**Про рассинхрон часов:** `exp - Date.now()/1000` сравнивает часы бэкенда с часами
фронтенда. На одной машине это неважно; при разъезде хостов порог в 30 с может оказаться
мал. Если фронт и бэк разъедутся по хостам — поднять порог до 60 с.

## 7. Формы

`react-hook-form` + `@hookform/resolvers`, схемы из `packages/shared`, расширения — в
`src/lib/validation/auth.ts` (схемы можно расширять/переопределять на фронтенде):

```ts
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });
```

`confirmPassword` вырезать перед POST (деструктуризацией) — слать пароль дважды незачем.

- Ошибки полей — из резолвера, под инпутом, с `aria-invalid`/`aria-describedby`.
- 409 → `setError('email', …)`; 401 → баннер `role="alert"` без привязки к полю (не даём
  перебирать пользователей).
- `disabled={isSubmitting}` + спиннер `Loader2`.
- После успеха: `router.push('/dashboard')` **и обязательно `router.refresh()`** — иначе
  клиентский роутер отдаст закешированный RSC-payload, отрендеренный без сессии.
- Параметр `next` читаем в серверном `page.tsx` (`searchParams` — Promise в Next 16) и
  передаём пропом, чтобы не заводить `<Suspense>` вокруг `useSearchParams()`.

## 8. Dashboard

`src/app/dashboard/page.tsx` — серверный: `getSession()`, при `null` → `redirect('/login')`
(defence-in-depth за proxy), иначе имя/email/`createdAt` в `Card` + `LogoutButton`.

## Файлы

**Создать:** `src/lib/auth/{token,cookies,config,refresh}.ts`; `src/lib/{session,api}.ts`;
`src/lib/validation/auth.ts`; `src/components/{theme-provider,theme-toggle}.tsx`;
`src/components/auth/{login-form,register-form,logout-button}.tsx`;
`src/app/(auth)/{layout,login/page,register/page}.tsx`;
`src/app/api/auth/{register,login,refresh,logout}/route.ts`; `src/app/dashboard/page.tsx`;
`src/proxy.ts`.

Генерируются CLI: `components.json`, `src/lib/utils.ts`, `src/components/ui/*`.

**Изменить:** `apps/web/package.json`; `apps/web/next.config.ts` (dotenv);
`src/app/globals.css` (перезапишет `init`); `src/app/layout.tsx` (ThemeProvider,
`suppressHydrationWarning`); `src/app/page.tsx` (миграция классов + снять
`healthResponseSchema.parse`); `CLAUDE.md` — заметка про Tailwind (строки 151–153: `@theme`
→ токены shadcn, классовый `dark` вместо медиа-запроса) и правило про re-парсинг ответов
на фронтенде (решение 3), плюс архитектура кук: токены только в httpOnly-куках, refresh —
единственной реализацией в `/api/auth/refresh` (proxy и клиент ходят в неё), никогда в RSC.

**Не трогаем:** `apps/backend/**`, `packages/shared/**`, `turbo.json`, корневой
`package.json`, корневой `.env.example`.

## Проверить по ходу реализации

1. Поддержку zod v4 в установившейся версии `@hookform/resolvers`; при отказе
   `zodResolver` — `standardSchemaResolver` (zod v4 реализует Standard Schema).
   `.refine()` даёт `ZodEffects` — если типизация резолвера ругается, базовый объект
   держать отдельно.
2. Не создал ли `shadcn init` `tailwind.config.js` и не ушли ли зависимости в корневой
   `package.json`.
3. Формат `JWT_REFRESH_EXPIRES_IN` в реальном `.env` (`7d`) — хелпер должен покрывать
   `s|m|h|d`.

## Верификация

```bash
pnpm install
pnpm db:up && pnpm db:generate && pnpm db:migrate
pnpm typecheck && pnpm lint && pnpm format:check
pnpm dev
```

`pnpm test` / `test:e2e` — вне скоупа по CLAUDE.md, падения там не блокируют.

Ручной прогон:

1. `/dashboard` разлогиненным → `/login?next=%2Fdashboard`.
2. `/register`, пароль в 5 символов → ошибка поля **без** сетевого запроса (доказывает,
   что общая схема реально подключена резолвером); несовпадающий `confirmPassword` → ошибка.
3. Валидная регистрация → `/dashboard` с только что введёнными именем и email.
4. Тот же email повторно → сообщение о занятом email, в Network `409`.
5. `/login` залогиненным → редирект на `/dashboard`.
6. Выход → `/login`; кнопка «Назад» не должна показать закешированный дашборд.
7. Неверный пароль → баннер, `401`. Верный → `/dashboard`.
8. Переключатель темы: светлая/тёмная/системная, значение переживает перезагрузку, при
   загрузке нет вспышки чужой темы.

Проактивный refresh (главное нововведение):

- `JWT_ACCESS_EXPIRES_IN=60s`, войти, подождать ~35 с, открыть `/dashboard`: страница
  рендерится **без** редиректа на логин, и **обе** куки сменили значение. Смена только
  access — ошибка ротации.
- В том же окне быстро открыть 2–3 вкладки `/dashboard`: все должны отрендериться, никто
  не разлогинивается — доказательство, что `Map` схлопнул одновременные refresh.
- Клиентский refresh (решение 6): в консоли на `/dashboard`
  `await fetch('/api/auth/refresh', { method: 'POST' })` → `200 {"ok":true}`, в Network у
  ответа **обе** куки в `Set-Cookie`, в теле токенов нет. Затем то же самое пятью
  параллельными `Promise.all` — все пять должны вернуть `ok`, а не четыре 401: это
  проверка, что дедупликация живёт в handler'е, а не в proxy.
- После `POST /api/auth/logout` вызвать `/api/auth/refresh` → `401`, и обе куки сняты.

Безопасность:

- DevTools → Application → Cookies: у обеих кук **HttpOnly**, `SameSite=Lax`, `Path=/`,
  `Secure` снят в dev.
- В консоли `document.cookie`, `localStorage`, `sessionStorage` — токенов нет.
- Network → документ `/dashboard` → поиск `eyJ` в RSC-payload: **ноль совпадений**.
- Ответ `POST /api/auth/login` — ровно `{"ok":true}`.
- **Отзыв на сервере:** скопировать refresh-куку, выйти, затем
  `curl -X POST localhost:3001/api/auth/refresh -H 'content-type: application/json' -d '{"refreshToken":"<...>"}'`
  → `401`, то есть logout действительно дошёл до бэкенда.
