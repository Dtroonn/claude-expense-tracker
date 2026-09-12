## Project state

The Prisma schema has `User`, `RefreshToken`, `Category`, `Transaction`. Built: health endpoint,
auth (register / login / refresh / logout), category CRUD, transaction CRUD + paginated list +
monthly summary. Budget modelling is not written yet.

## Layout

```
src/auth  src/user  src/category  src/transaction   feature modules
src/shared/crypto                                   cross-cutting helpers
src/prisma                                          PrismaService (@Global)
src/generated/prisma                                generated client — gitignored
```

A feature module is `<name>.controller.ts`, `<name>.repository.ts`, `commands/`, `queries/` and
`dto/`, with each handler in `commands|queries/handlers/`.

`main.ts` sets the global `api` prefix, the global `ZodValidationPipe`, and CORS.
`app.module.ts` registers `ZodSerializerInterceptor` as an `APP_INTERCEPTOR` and loads `.env`
then `../../.env` (the root one is shared with docker-compose). Swagger UI is at `/docs`.

## Architecture: CQRS

- **No per-feature service layer.** Logic lives in command/query handlers; a feature is a
  repository plus handlers. Don't reintroduce `UserService`-style classes — handlers inject
  shared machinery instead. Cross-cutting helpers are modules under `src/shared/` (e.g.
  `CryptoModule` → `PasswordHasherService`).
- **Commands/queries carry their result type**: extend `Command<T>` / `Query<T>` and call
  `super()`. So `this.queryBus.execute(new GetUserByIdQuery(id))` with no type arguments, and
  handler `execute` needs no return annotation. Controllers still annotate with the shared
  contract type.
- **Repositories return generated Prisma types** (`User`, `Prisma.*CreateInput`) from
  `@/generated/prisma/client`. No hand-written row interfaces. A row shape with relations is
  `Prisma.XGetPayload<{ include: … }>`, exported from the repository
  (`TransactionWithCategory`).
- Converting a DB row to a wire DTO (`Decimal` → `number`, `Date` → ISO string) is the
  controller's job — see `toDto` in `transaction.controller.ts`. Handlers pass rows through.
- `PrismaModule` is `@Global()` — `PrismaService` injects anywhere without re-importing.
- **Injected constructor params must be VALUE imports**, never `import { type Foo }`.

## DTOs

Every DTO class is a one-liner wrapping a `packages/shared` schema:

```ts
export class CreateTransactionDtoClass extends createZodDto(createTransactionSchema) {}
```

Controllers take those classes in `@Body()`/`@Query()` and annotate the return with the shared
_type_, with `@ZodResponse({ type: XDtoClass })` for serialization and OpenAPI. Never declare a
schema in `apps/backend` that the frontend also needs — it goes in `packages/shared`.

Query params arrive as strings, so query schemas use `z.coerce` with `.default()`s
(`paginationQuerySchema`); a controller therefore never sees `undefined` for `page`/`limit`.

## Auth

Access tokens are JWTs (`JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`) whose payload is
`{ user: UserResponseDto }`. Refresh tokens are **not** JWTs: 32 random bytes, stored SHA-256
hashed (fast and deterministic, so a presented token can be looked up by equality — bcrypt's
per-call salt can't do that), and **rotating** — `redeemRefreshToken` revokes on use, so each
one is redeemable exactly once. Protect a route with `@UseGuards(JwtAuthGuard)` and read the
caller via `@CurrentUser() user: UserResponseDto`.

Every user-scoped repository query filters by `userId` (`findByIdForUser`, not `findById`) —
ownership is enforced in the query, not by a check after loading.

## Testing

Out of scope. `pnpm test:e2e` **currently fails**, and that is expected, not a regression: the
Prisma generator emits `.ts` sources with `.js` import specifiers, which Jest can't resolve, and
it breaks as soon as the module graph reaches `PrismaService` — which the auth stack does.
Verify with `pnpm typecheck` and `pnpm lint`.

`test/app.e2e-spec.ts` stubs `PrismaService` so the suite needs no database and no generated
client. Keep it that way unless a test genuinely needs Postgres.

## Non-obvious constraints

**Prisma 7:**

1. `prisma-client-js` is gone. The schema uses the `prisma-client` generator with explicit
   `output` and `moduleFormat = "cjs"` (load-bearing — inferred ESM emits `import.meta.url` and
   breaks Nest's CJS build). The client is **gitignored**, so `pnpm db:generate` is required
   after a fresh clone or the backend won't compile. It emits no index file: import from
   `../generated/prisma/client`, **not** `@prisma/client` and not the bare directory.
2. `url` is removed from the `datasource` block (adding it back → P1012). The CLI reads its URL
   from `apps/backend/prisma.config.ts`, which loads `.env` explicitly since Prisma 7 no longer
   auto-loads it. Prisma bundles `jiti`, so that TS config needs no `tsx`.
3. `PrismaService` does **not** `extends PrismaClient` — that export is a generic construct
   signature, not a concrete class, and extending it compiles while silently losing the whole
   instance side (`$connect`, model delegates). Verified empirically, not assumed from docs. It
   builds `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` and exposes it as
   `.client`, so it's always `this.prisma.client.user…`. CLI and runtime connect through
   separate paths; changing one doesn't change the other.
