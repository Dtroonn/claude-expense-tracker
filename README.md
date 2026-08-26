# Expense Tracker

Monorepo scaffold: **Next.js 16** frontend, **Nest.js 11** backend, **Postgres 17** via
**Prisma 7**, wired together with **pnpm workspaces + Turborepo**.

This is a scaffold — there is no domain code yet. The Prisma schema has no models, and the
backend exposes only a health endpoint. What it does prove is that the workspace links, the
shared contract package resolves from both apps, and every task runs through Turborepo.

## Layout

```
apps/
  web/        Next.js 16 (App Router, React 19, Tailwind v4) — port 3000
  backend/    Nest.js 11 + Prisma                            — port 3001
packages/
  shared/         zod contracts shared by both apps
  tsconfig/       base / nextjs / nestjs / library tsconfigs
  eslint-config/  flat ESLint configs
```

## Setup

Dependencies are **not** installed — no lockfile is committed. Start here:

```bash
pnpm install
cp .env.example .env          # root: docker-compose + Prisma read this
```

Start Postgres (needs Docker Desktop running — `docker` was not on PATH when this was
scaffolded):

```bash
pnpm db:up                    # docker compose up -d
docker compose ps             # expect: healthy
```

Generate the Prisma client, then run both apps:

```bash
pnpm db:generate
pnpm dev
```

- Frontend → http://localhost:3000
- Backend → http://localhost:3001/api/health

The home page fetches that health endpoint through the shared zod schema. If it renders
`ok`, the whole chain is wired correctly.

## Scripts

All run from the repo root and fan out through Turborepo.

| Script                   | Does                                           |
| ------------------------ | ---------------------------------------------- |
| `pnpm dev`               | Both apps in watch mode                        |
| `pnpm build`             | Build all packages and apps                    |
| `pnpm lint`              | ESLint across the workspace                    |
| `pnpm typecheck`         | `tsc --noEmit` everywhere                      |
| `pnpm test`              | Backend Jest unit tests                        |
| `pnpm test:e2e`          | Backend e2e (Prisma is stubbed — no DB needed) |
| `pnpm format`            | Prettier write                                 |
| `pnpm db:up` / `db:down` | Start / stop Postgres                          |
| `pnpm db:generate`       | Regenerate the Prisma client                   |
| `pnpm db:migrate`        | Create and apply a migration                   |
| `pnpm db:studio`         | Prisma Studio                                  |

## Adding your first model

`apps/backend/prisma/schema.prisma` intentionally has no models, so `pnpm db:migrate` has
nothing to do until you add one. Add a model, then:

```bash
pnpm db:migrate     # names and applies the initial migration
```

Inject `PrismaService` (already global via `PrismaModule`) into any feature module and query
through `PrismaService.client` — e.g. `this.prisma.client.expense.findMany()`. It's composed,
not inherited (`PrismaService` does not `extends PrismaClient`); see the note in the section
below for why.

## Sharing types between the apps

`packages/shared` ships **raw TypeScript** — no build step. Next compiles it via
`transpilePackages`; Nest resolves it through the normal pnpm workspace symlink (it's a real
package with `main`/`types`/`exports`, so no tsconfig `paths` entry is needed); Jest needs a
`moduleNameMapper` entry since it doesn't do TS-aware module resolution. The package declares
no `"type"` field on purpose, so each consumer's compiler picks the module format.

The pattern (see `packages/shared/src/health.ts`): define a zod schema, infer the type from
it, export both. Backend validates with the schema, frontend imports the type.

## Notes on version choices

- **TypeScript is pinned to 5.9.3**, though 7.x is `latest` on npm. `@nestjs/cli@11` still
  bundles TS 5.7 and Nest's build depends on `emitDecoratorMetadata`; pairing that with the
  compiler rewrite is not a bet worth taking in a scaffold. 5.9.3 also satisfies Prisma 7's
  `typescript >=5.4.0` peer. Revisit when Nest supports TS 7.
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
- **Tailwind v4** has no `tailwind.config.js`; theme tokens live in `@theme` inside
  `apps/web/src/app/globals.css`.
