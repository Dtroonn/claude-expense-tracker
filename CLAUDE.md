# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Early. The Prisma schema has `User` and `RefreshToken`; the backend has a health endpoint
plus a working auth stack (register / login / refresh / logout, JWT access tokens with
rotating opaque refresh tokens). Expense/category/budget modelling is still to be written.

**Testing is out of scope for now.** Don't add tests, and don't treat a failing `pnpm test` /
`pnpm test:e2e` as a blocker. The e2e suite currently fails to resolve the generated Prisma
client: the generator emits `.ts` sources with `.js` import specifiers, and Jest can't resolve
those — it breaks as soon as anything in the module graph reaches `PrismaService`, which the
auth stack does. Verify work with `pnpm typecheck` and `pnpm lint` instead.

## Commands

All commands run from the repo root and fan out through Turborepo.

```bash
pnpm install                # deps are NOT installed in a fresh clone
cp .env.example .env        # root .env feeds both docker-compose and Prisma
pnpm db:up                  # docker compose up -d  (needs Docker Desktop running)
pnpm db:generate            # REQUIRED after clone — see "Prisma 7" below
pnpm dev                    # web :3000, backend :3001
```

| Task               | Command                        |
| ------------------ | ------------------------------ |
| Build everything   | `pnpm build`                   |
| Lint / typecheck   | `pnpm lint` · `pnpm typecheck` |
| Backend unit tests | `pnpm test`                    |
| Backend e2e        | `pnpm test:e2e`                |
| Format             | `pnpm format`                  |
| Migration          | `pnpm db:migrate`              |
| Prisma Studio      | `pnpm db:studio`               |

Single test / single app:

```bash
pnpm --filter @expense-tracker/backend test -- app.controller     # by name pattern
pnpm --filter @expense-tracker/backend test -- -t "returns a health payload"
pnpm --filter @expense-tracker/web dev                            # one app only
```

Workspace names are `@expense-tracker/{web,backend,shared,tsconfig,eslint-config}` — note the
backend is `backend`, not `api`.

## Architecture

```
apps/web        Next.js 16, App Router, React 19, Tailwind v4   :3000
apps/backend    Nest.js 11 + Prisma 7                           :3001, routes under /api
packages/shared zod contracts imported by BOTH apps
packages/{tsconfig,eslint-config}   shared config, consumed via workspace deps
```

**The shared-contract pattern is the spine of this repo.** `packages/shared` defines a zod
schema, infers the TS type from it, and exports both (`src/health.ts` is the reference
example). The backend builds responses and `.parse()`s them through the schema; the frontend
imports the inferred type and re-parses the response. One source of truth — do not hand-write
duplicate interfaces on either side.

`packages/shared` ships **raw TypeScript with no build step**, consumed three different ways:
Next via `transpilePackages` (`apps/web/next.config.ts`), Nest via normal `node_modules`
resolution (it's pnpm-workspace-linked and declares `main`/`types`/`exports` pointing at
`src/index.ts`, so no tsconfig `paths` entry is needed), Jest via `moduleNameMapper` (Jest
doesn't do TS-aware resolution, so it still needs one). Adding a new consumer means wiring a
fourth.

Because of that, the package deliberately **declares no `"type"` field and uses extensionless
relative imports**. Each consumer's compiler picks the module format. Adding `"type": "module"`
or a `.js` specifier breaks the Nest build — CommonJS emit becomes `require("./health.js")`
against a file that only exists as `health.js` post-compile in a different layout.

`PrismaModule` is `@Global()`, so `PrismaService` injects into any feature module without
re-importing.

### CQRS

**There is no per-feature service layer.** Business logic lives directly in command and query
handlers — `user/` has a repository plus handlers and nothing between them. Do not reintroduce
a `UserService`-style class; a handler that needs shared machinery injects it instead.

Cross-cutting helpers live in `src/shared/` as their own modules — currently
`shared/crypto/crypto.module.ts` exporting `PasswordHasherService` (bcrypt hashing and
comparison, cost factor in one place). Import `CryptoModule` where a handler needs it.

**Commands and queries carry their result type**: they extend `Command<T>` / `Query<T>` from
`@nestjs/cqrs` and call `super()`. That makes `execute()` infer the result, so it's
`this.queryBus.execute(new GetUserByIdQuery(id))` with no type arguments — never
`execute<GetUserByIdQuery, User | null>(...)`. `ICommandHandler<C>` / `IQueryHandler<Q>` pick
up the same type, so handler `execute` methods need no return annotation either. Controllers
still annotate their return types with the shared contract type (`Promise<AuthResponse>`);
with typed commands this is checked against the bus rather than asserted.

**Repository methods return the generated Prisma types** (`User`, `RefreshToken`, and
`Prisma.*CreateInput`) imported from `@/generated/prisma/client`. Do not hand-write
`UserRecord`-style row interfaces — the generated types are the source of truth for DB shapes,
the way `packages/shared` is for wire shapes.

## Non-obvious constraints

**TypeScript is pinned to exactly `5.9.3` across every package** even though 7.x is `latest`
on npm. `@nestjs/cli@11` bundles TS 5.7 internally and Nest's build depends on
`emitDecoratorMetadata`. Do not bump to 7.x until Nest supports it. 5.9.3 also satisfies
Prisma 7's `typescript >=5.4.0` peer.

**Prisma 7 changed three things that will bite you.**

1. **`prisma-client-js` is gone.** The schema uses the `prisma-client` generator with an
   explicit `output`, and `moduleFormat = "cjs"` is load-bearing — left to infer, the
   generator emits ESM `import.meta.url` and breaks Nest's CommonJS build. The client lands in
   `apps/backend/src/generated/prisma` and is **gitignored**, so `pnpm db:generate` is required
   after a fresh clone or the backend will not compile. It emits `.ts` sources with no index
   file: import `PrismaClient` from `../generated/prisma/client`, **not** `@prisma/client` and
   not the bare directory.

2. **`url` was removed from the datasource block.** The schema's `datasource db` has only
   `provider`. Adding `url` back fails validation with P1012. The CLI (`migrate`, `studio`)
   reads its URL from `apps/backend/prisma.config.ts`, which loads `.env` explicitly because
   Prisma 7 no longer auto-loads it. Prisma bundles `jiti`, so that TS config needs no `tsx`.

3. **A driver adapter is now mandatory, and `PrismaService` does not `extends PrismaClient`.**
   This generator's `PrismaClient` export is a value typed via a generic construct signature
   (`PrismaClientConstructor`), not a concrete class — `class X extends PrismaClient` compiles
   but silently loses the entire instance side (`$connect`, model delegates, everything).
   Confirmed empirically against the generated client, not assumed from docs. `PrismaService`
   instead builds `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
   (`@prisma/adapter-pg`) and exposes it as `PrismaService.client`, matching the official
   Prisma 7 quickstart's own composition pattern. So it's always `this.prisma.client.user...`
   in a feature module, not `this.prisma.user...`. CLI and runtime get their connection
   through two separate paths (`prisma.config.ts` vs. the adapter); changing one does not
   change the other.

**`pnpm db:migrate` has nothing to do until a model exists.** With a model-less schema this is
expected, not a failure.

**Tailwind v4 has no `tailwind.config.js`.** Theme tokens live in `@theme` in
`apps/web/src/app/globals.css`, and `@theme` must stay top-level — dark-mode overrides are
plain `:root` blocks inside the media query.

**The backend e2e suite stubs `PrismaService`** (`apps/backend/test/app.e2e-spec.ts`), so it
runs with no database and no generated client. Keep it that way unless a test genuinely needs
Postgres.

**Injected constructor params must be VALUE imports, never `import { type Foo }`.** The
backend compiles with `emitDecoratorMetadata`, and a type-only import is erased before
metadata is emitted — `design:paramtypes` then records `Function` instead of the class, Nest
cannot resolve the dependency, and the app fails at startup with a "cannot resolve
dependency ... at index [n]" error. Confirmed by compiling both forms and diffing the emitted
`__metadata` call, not assumed from docs. `@typescript-eslint/consistent-type-imports` is
therefore **off** in `packages/eslint-config/nest.js` — it autofixes working DI into broken DI.
Note that editors run their own TS "prefer type-only auto-imports" setting independently of
ESLint; if imports keep flipping back to `type` on save, that's the IDE, and the setting needs
turning off locally. Type-only imports remain correct for everything that is *not* injected
(zod schemas, `ICommandHandler`, interfaces, contract types).

ESLint uses flat config throughout (ESLint 10); app-level `eslint.config.mjs` files just
re-export from `packages/eslint-config`.
