# Auth: User module + JWT authorization via CQRS

## Context

The backend is a scaffold: `prisma/schema.prisma` has **zero models** and the only route is
`GET /api/health`. Everything in the expense tracker will be per-user, so authentication is the
first real domain feature and it defines the persistence, contract, and module-communication
patterns every later feature (expenses, categories, budgets) will copy.

Goal: a `User` module owning the user entity, its repository and service, plus an `Auth` module
that registers and logs in users and issues JWTs. The two modules talk **only over CQRS**
(`CommandBus` / `QueryBus`) — `AuthModule` never injects `UserService`.

Decisions confirmed with the user: access + refresh tokens, commands+queries across the module
boundary (no domain events), `bcrypt` for hashing, and shared zod contracts in
`packages/shared`.

## Dependencies to add

`apps/backend`: `@nestjs/cqrs`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`,
`bcrypt`; dev: `@types/passport-jwt`, `@types/bcrypt`. None are currently present anywhere in
the lockfile.

## 1. Prisma schema — first models

`apps/backend/prisma/schema.prisma` (currently model-less):

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  name         String
  passwordHash String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique      // bcrypt hash — raw token never stored
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
}
```

A separate `RefreshToken` table (not a column on `User`) so multiple devices work and logout
revokes one session. Then `pnpm db:generate` and `pnpm db:migrate` — this creates the repo's
first migration, `prisma/migrations/` does not exist yet.

## 2. Shared contracts — `packages/shared`

New `src/auth.ts` + `src/user.ts`, both re-exported from `src/index.ts`. Follow `src/health.ts`
exactly: define schema, `z.infer` the type, export both. Extensionless import in `index.ts`,
no `"type"` field, zod v4 API.

- `user.ts`: `publicUserSchema` (`id`, `email`, `name`, `createdAt`) → `PublicUser`. **Never**
  includes `passwordHash`.
- `auth.ts`: `registerRequestSchema` (email/name/password with min length),
  `loginRequestSchema`, `refreshRequestSchema`, `authTokensSchema`
  (`accessToken`, `refreshToken`, `expiresIn`), `authResponseSchema`
  (`{ user: publicUserSchema, tokens: authTokensSchema }`).

Backend `.parse()`s every response through these before returning, as `AppService.getHealth`
does.

## 3. Validation bridge — zod meets the global ValidationPipe

`main.ts` installs a global `class-validator` `ValidationPipe` with `forbidNonWhitelisted: true`,
which would strip/reject bodies typed only by zod. Add a small
`src/common/pipes/zod-validation.pipe.ts`:

```ts
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}
  transform(value: unknown) {
    const r = this.schema.safeParse(value);
    if (!r.success) throw new BadRequestException(z.treeifyError(r.error));
    return r.data;
  }
}
```

Applied per-route with `@Body(new ZodValidationPipe(loginRequestSchema))`. Method-level pipes
run before the global one and the parsed object passes through cleanly.

## 4. User module — `src/user/`

```
user/
  user.module.ts
  user.repository.ts              // the only file touching this.prisma.client.user
  user.service.ts                 // domain rules; calls the repository
  commands/create-user.command.ts
  commands/handlers/create-user.handler.ts
  queries/get-user-by-email.query.ts
  queries/get-user-by-id.query.ts
  queries/handlers/*.handler.ts
```

- `UserRepository` — `create`, `findByEmail`, `findById`. Remember `PrismaService` exposes the
  client at `.client`: `this.prisma.client.user.findUnique(...)`
  (`apps/backend/src/prisma/prisma.service.ts`). `PrismaModule` is `@Global()`, so no import.
- `UserService` — hashes the password with `bcrypt` (cost 12), throws `ConflictException` on a
  duplicate email, exposes `verifyPassword`. Owns hashing so the plaintext never leaves the
  user module.
- Handlers are thin: `CreateUserHandler` → `userService.create(...)`;
  `GetUserByEmailHandler` → `repository.findByEmail(...)`. Query handlers return the **full**
  user row (including `passwordHash`) since `AuthService` needs it to verify; the controller
  maps to `PublicUser` via the shared schema before responding.
- `UserModule` imports `CqrsModule`, provides service + repository + handlers, exports nothing
  needed by auth — the bus is the interface.

## 5. Auth module — `src/auth/`

```
auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  token.service.ts                     // sign/verify/rotate; owns RefreshToken rows
  refresh-token.repository.ts
  commands/{register,login,refresh,logout}.command.ts
  commands/handlers/*.handler.ts
  strategies/jwt.strategy.ts
  guards/jwt-auth.guard.ts
  decorators/current-user.decorator.ts
```

Routes (global prefix `api` is set in `main.ts`):

| Route                     | Body                    | Returns        |
| ------------------------- | ----------------------- | -------------- |
| `POST /api/auth/register` | `registerRequestSchema` | `AuthResponse` |
| `POST /api/auth/login`    | `loginRequestSchema`    | `AuthResponse` |
| `POST /api/auth/refresh`  | `refreshRequestSchema`  | `AuthResponse` |
| `POST /api/auth/logout`   | `refreshRequestSchema`  | `204`          |

All three of register/login/refresh return the same `AuthResponse` (`{ user, tokens }`), so the
client always has a fresh `PublicUser` alongside its tokens and no separate `/me` lookup is
needed. `RefreshHandler` therefore resolves the user via `GetUserByIdQuery` after validating the
refresh token.

The controller dispatches to `CommandBus` only. `RegisterHandler` sends `CreateUserCommand`
over the `CommandBus` into the user module, then asks `TokenService` for a pair.
`LoginHandler` sends `GetUserByEmailQuery` over the `QueryBus`, verifies via bcrypt, and returns
`UnauthorizedException('Invalid credentials')` for both a missing user and a bad password
(no user enumeration).

`TokenService`: access token 15m signed with `JWT_ACCESS_SECRET`, payload `{ sub, email }`;
refresh token an opaque `randomBytes(32).toString('hex')`, bcrypt-hashed into `RefreshToken`
with a 7d `expiresAt`. Refresh **rotates**: verify, revoke the old row, issue a new pair. Logout
sets `revokedAt`.

`JwtStrategy` (passport-jwt, `ExtractJwt.fromAuthHeaderAsBearerToken()`) validates the access
token, then resolves the user through `GetUserByIdQuery` on the `QueryBus` so even the strategy
respects the CQRS boundary. `@CurrentUser()` reads `request.user`.

No auth route itself uses `JwtAuthGuard` — all four are public. The guard, strategy, and
decorator exist so the upcoming expense/category/budget modules can protect their routes and
scope queries to the caller; they are the payoff for building auth first.

`AuthModule` imports `CqrsModule`, `PassportModule`, and `JwtModule.registerAsync` reading
secrets from `ConfigService`; exports `JwtAuthGuard` for future feature modules.

## 6. Wiring and config

- `app.module.ts`: add `CqrsModule.forRoot()`, `UserModule`, `AuthModule`.
- `.env.example` (root): `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN=15m`,
  `JWT_REFRESH_EXPIRES_IN=7d`. Add the same keys to `turbo.json` `build.env` or turbo will not
  invalidate its cache correctly.
- **Do not copy `app.controller.ts`'s `import { type AppService }` pattern** — a type-only
  import erases `design:paramtypes` and breaks DI. New controllers use plain value imports.

## Verification

```bash
pnpm install
pnpm db:up            # Docker Desktop must be running
pnpm db:generate      # regenerates the gitignored client with User + RefreshToken
pnpm db:migrate       # creates the repo's first migration
pnpm typecheck && pnpm lint
pnpm dev
```

Then against a running backend:

```bash
curl -X POST localhost:3001/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","name":"A","password":"password123"}'
curl -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"password123"}'
curl -X POST localhost:3001/api/auth/refresh -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'
curl -X POST localhost:3001/api/auth/logout -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'
```

Expect: register/login/refresh each return `{ user, tokens }` with no `passwordHash` anywhere in
the payload, login 401 on a wrong password or unknown email, and a refresh token rejected after
it has been used once (rotation) or after logout. `pnpm db:studio` to confirm rows.

## Out of scope

No tests — no unit specs and no e2e suite for auth in this change, per the user's decision;
verification is by typecheck, lint, and manual curl. Note the existing `test/app.e2e-spec.ts`
stubs `PrismaService` as `{ $connect, $disconnect }`, which does not match the real `.client`
shape, so whenever auth tests are written later that stub needs extending.

No frontend work — `apps/web` gets no login UI or token storage in this change. Roles/permissions,
password reset, and email verification are deferred.
