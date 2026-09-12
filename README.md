# Expense Tracker

Monorepo: **Next.js 16** frontend, **Nest.js 11** backend, **Postgres 17** via **Prisma 7**,
wired together with **pnpm workspaces + Turborepo**.

Built so far: auth (register / login / refresh / logout with rotating refresh tokens), category
CRUD, transaction CRUD with a paginated list and a monthly summary, plus a health endpoint.
Budget modelling isn't written yet.

## Layout

```
apps/
  web/        Next.js 16 (App Router, React 19, Tailwind v4) — port 3000
  backend/    Nest.js 11 + Prisma 7                          — port 3001, routes under /api
packages/
  shared/         zod contracts shared by both apps
  tsconfig/       base / nextjs / nestjs / library tsconfigs
  eslint-config/  flat ESLint configs
```

Deeper notes live next to the code: `apps/backend/CLAUDE.md`, `apps/web/CLAUDE.md`, and
`REVIEW.md` for what's checked on review.

## Setup

Dependencies are **not** installed in a fresh clone. Start here:

```bash
pnpm install
cp .env.example .env          # root: docker-compose + Prisma read this
```

Start Postgres (needs Docker Desktop running):

```bash
pnpm db:up                    # docker compose up -d
docker compose ps             # expect: healthy
```

Apply migrations, generate the Prisma client, then run both apps:

```bash
pnpm db:migrate               # applies the three committed migrations
pnpm db:generate              # REQUIRED — the generated client is gitignored
pnpm dev
```

- Frontend → http://localhost:3000
- Backend → http://localhost:3001/api/health
- Swagger UI → http://localhost:3001/docs

The frontend's root route is the transactions page, which is auth-protected — register at
`/register` first, and it redirects you back once you have a session.

## API

All routes are prefixed with `/api`. Everything except `health` and the `auth` endpoints
requires a Bearer access token (`JwtAuthGuard`).

| Method | Route | Does |
| --- | --- | --- |
| `GET` | `/health` | Liveness payload |
| `POST` | `/auth/register` · `/auth/login` | Create a session |
| `POST` | `/auth/refresh` · `/auth/logout` | Rotate / revoke a refresh token |
| `GET` `POST` | `/categories` | List, create |
| `PATCH` `DELETE` | `/categories/:id` | Update, delete |
| `GET` `POST` | `/transactions` | Paginated list, create |
| `GET` | `/transactions/summary` | Monthly income / expense totals |
| `GET` `PATCH` `DELETE` | `/transactions/:id` | Read, update, delete |

## Scripts

All run from the repo root and fan out through Turborepo.

| Script                   | Does                                           |
| ------------------------ | ---------------------------------------------- |
| `pnpm dev`               | Both apps in watch mode                        |
| `pnpm build`             | Build all packages and apps                    |
| `pnpm lint`              | ESLint across the workspace                    |
| `pnpm typecheck`         | `tsc --noEmit` everywhere                      |
| `pnpm test`              | Backend Jest unit tests (see the caveat below) |
| `pnpm test:e2e`          | Backend e2e (see the caveat below)             |
| `pnpm format`            | Prettier write (`format:check` to verify)      |
| `pnpm db:up` / `db:down` | Start / stop Postgres                          |
| `pnpm db:generate`       | Regenerate the Prisma client                   |
| `pnpm db:migrate`        | Create and apply a migration                   |
| `pnpm db:studio`         | Prisma Studio                                  |

Single app or single test:

```bash
pnpm --filter @expense-tracker/web dev
pnpm --filter @expense-tracker/backend test -- -t "returns a health payload"
```

**Tests are out of scope right now and `pnpm test` / `pnpm test:e2e` fail** — that's expected,
not a regression. The Prisma generator emits `.ts` sources with `.js` import specifiers, which
Jest can't resolve, and it breaks as soon as the module graph reaches `PrismaService`. Verify
work with `pnpm typecheck` and `pnpm lint`.

## Data model

`apps/backend/prisma/schema.prisma` has `User`, `RefreshToken`, `Category` and `Transaction`
(plus a `TransactionType` enum), with three migrations committed under `prisma/migrations/`.

After changing the schema:

```bash
pnpm db:migrate     # names and applies a new migration
pnpm db:generate    # refresh the generated client
```

Inject `PrismaService` (already global via `PrismaModule`) into any feature module and query
through `PrismaService.client` — e.g. `this.prisma.client.transaction.findMany()`. It's
composed, not inherited (`PrismaService` does not `extends PrismaClient`); see the note below
for why.

## Sharing types between the apps

`packages/shared` builds with **tsup** — cjs for Nest, esm for Next, `dts: false` with `types`
pointing straight at `src/index.ts`. Next also lists it in `transpilePackages` so its output
runs through the SWC pass. Jest needs its own `moduleNameMapper` entry (it doesn't resolve
package `exports`), which maps the package to `src/index.ts` and bypasses `dist` entirely.

Root `build` / `lint` / `typecheck` / `test` rebuild it automatically. **`dev` does not** — after
editing `packages/shared/src` while `pnpm dev` is running, rebuild it by hand
(`pnpm --filter @expense-tracker/shared build`) or run its `dev` alongside for `tsup --watch`,
since consumers read `dist`.

The pattern (see `packages/shared/src/health.ts`): define a zod schema, infer the type from it,
export both. The backend `.parse()`s through the schema; the frontend imports the inferred type
and **casts**, because the backend already validated both directions. Frontend zod is only for
user input the backend hasn't seen yet. Never hand-write a duplicate interface on either side.

## Notes on version choices

- **TypeScript is pinned to exactly 5.9.3** everywhere, though 7.x is `latest` on npm.
  `@nestjs/cli@11` still bundles TS 5.7 and Nest's build depends on `emitDecoratorMetadata`;
  pairing that with the compiler rewrite isn't a bet worth taking. 5.9.3 also satisfies Prisma
  7's `typescript >=5.4.0` peer. Revisit when Nest supports TS 7.
- **Prisma 7 dropped `prisma-client-js`.** The schema uses the `prisma-client` generator with
  an explicit `output`, and `moduleFormat = "cjs"` — left to infer it emits ESM
  (`import.meta.url`), which breaks Nest's CommonJS build. The generated client lands in
  `apps/backend/src/generated/prisma` and is gitignored, so `pnpm db:generate` is required
  after a fresh clone. Import from `../generated/prisma/client` — there is no index file.
- **Prisma 7 removed `url` from the datasource block.** Connection strings now live in
  `apps/backend/prisma.config.ts` for the CLI, and the runtime client requires a driver
  adapter (`@prisma/adapter-pg`) passed to the `PrismaClient` constructor. Those are two
  independent paths to the same database.
- **`PrismaService` composes `PrismaClient`, it doesn't extend it.** With this generator,
  `PrismaClient` is a value typed via a generic construct signature, not a concrete class —
  `class X extends PrismaClient` compiles but silently loses `$connect` and every model
  delegate. Confirmed by compiling the generated client directly. `PrismaService` builds the
  client in the constructor and exposes it as `.client`, matching Prisma's own quickstart for
  this generator.
- **Tailwind v4** has no `tailwind.config.js`; theme tokens live in
  `apps/web/src/app/styles/globals.css`, with dark mode driven by a class rather than
  `prefers-color-scheme`.
