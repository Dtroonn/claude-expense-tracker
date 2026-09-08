# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Early. The Prisma schema has `User`, `RefreshToken`, `Category`, and `Transaction`; the backend
has a health endpoint, a working auth stack (register / login / refresh / logout, JWT access
tokens with rotating opaque refresh tokens), CRUD for categories, and CRUD + a paginated list +
a monthly summary for transactions. The frontend's main screen (`/`) lists the current month's
transactions with pagination behind a sidebar shared with `/categories` and `/profile`. Budget
modelling is still to be written.

**Testing is out of scope for now.** Don't add tests, and don't treat a failing `pnpm test` /
`pnpm test:e2e` as a blocker. The e2e suite currently fails to resolve the generated Prisma
client: the generator emits `.ts` sources with `.js` import specifiers, and Jest can't resolve
those — it breaks as soon as anything in the module graph reaches `PrismaService`, which the
auth stack does. Verify work with `pnpm typecheck` and `pnpm lint` instead.

## Branching

This repo uses GitHub flow: `main` is always deployable, and all work happens on short-lived
feature branches created off `main` (e.g. `feature/main-page-frontend`), merged back via PR.
Don't commit directly to `main`.

## Commit messages

This repo follows [Conventional Commits](https://www.conventionalcommits.org/ru/v1.0.0/)
(`<type>[optional scope]: <description>`, e.g. `feat(transaction): add transaction module`).
Existing history predates this convention and was not rewritten; apply it going forward.

## Pull requests

PRs target `main` and use `gh pr create`. The title follows Conventional Commits, same as
commit messages (`<type>[optional scope]: <description>`) — it's fine for the title to match
the branch's main commit if there's a single logical change. The body has two sections:

- **Summary** — a few bullet points on what changed and why, covering both frontend and
  backend when a PR touches both. Written from `git diff main`, not from memory of the work,
  so it reflects what's actually in the diff.
- **Test plan** — a checklist of how to verify the change: `pnpm typecheck` / `pnpm lint`
  always, plus manual verification steps for anything with user-facing behavior (a page to
  visit, a flow to click through). Leave boxes unchecked; they're for whoever reviews or
  merges to tick off, not a claim that they were run.

Before opening a PR, make sure the branch's work is actually committed — check `git status`
first, and commit any outstanding changes (per the Conventional Commits convention above)
rather than pushing a branch whose tip doesn't reflect the work.

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
example). The backend builds responses and `.parse()`s them through the schema. The frontend
imports the inferred type and casts network responses to it (`as HealthResponseDto`,
`as AuthResponseDto`, etc.) rather than re-parsing them with the schema: the backend already
validates both directions (a global `ZodValidationPipe` on request bodies, `@ZodResponse` on
responses), so a second parse in `apps/web` is redundant work, not extra safety. Reserve zod
on the frontend for validating user input the backend hasn't seen yet — form validation with
react-hook-form's `zodResolver`, reusing the same shared schemas (see
`apps/web/src/features/auth-login/model/schema.ts` and
`apps/web/src/features/auth-register/model/schema.ts`). One source of truth for the _shape_
either way — do not hand-write duplicate interfaces on either side.

`packages/shared` **builds with `tsup`** (`tsup.config.ts`), emitting both `dist/index.js`
(cjs) and `dist/index.mjs` (esm) from the single `src/index.ts` entry, with `dts: false` —
`package.json`'s `types` field points straight at `src/index.ts` instead of a generated
`.d.ts`. `exports` maps `require` to the cjs build and `import`/`default` to the esm build, so
Next consumes the esm output and Nest consumes the cjs output. `apps/web/next.config.ts` still
lists it under `transpilePackages`. That flag has two separate jobs: making Next resolve raw TS
source at all (moot now — `dist/index.mjs` is plain compiled JS), and routing the package's code
through Next's own SWC pass so it gets downleveled to Next's built-in target instead of shipping
untouched — Next does not transpile `node_modules`/workspace packages by default, and there's no
`.browserslistrc` here since Next's target is baked into SWC rather than read from a
browserslist file. Whether that second job is still load-bearing depends on whether tsup's
esbuild output target already matches what Next/SWC targets; `tsup.config.ts` sets no explicit
`target`, so this hasn't been verified either way — don't assume the entry is dead without
checking `tsup.config.ts`'s current `target` and Next's build output for `dist/index.mjs`
syntax. Jest still needs its own `moduleNameMapper` since it doesn't do package
`exports`-aware resolution.
Turborepo's `build`/`lint`/`typecheck`/`test` tasks all `dependsOn: ["^build"]`, so running them
from the root rebuilds `packages/shared` first automatically. `dev` does **not** depend on
build, so after changing anything under `packages/shared/src` while `pnpm dev` is running,
rebuild it manually (`pnpm --filter @expense-tracker/shared build`, or run `pnpm --filter
@expense-tracker/shared dev` alongside for `tsup --watch`) — consumers read `dist`, not `src`.

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

**Tailwind v4 has no `tailwind.config.js`.** Theme tokens live in CSS in
`apps/web/src/app/styles/globals.css`, generated by `shadcn init` (Radix base, Nova preset)
rather than hand-written: raw values sit in `:root`/`.dark`, and `@theme inline` maps them to
the utilities Tailwind generates. Dark mode is **class-based**, not media-query-based —
`@custom-variant dark (&:is(.dark *))` plus `next-themes` toggling a `.dark` class on
`<html>` (`ThemeProvider` in `apps/web/app/layout.tsx`, sourced from
`apps/web/src/app/providers/theme-provider.tsx`, `suppressHydrationWarning` required since the
class is applied before hydration). Don't reintroduce a `@media (prefers-color-scheme:
dark)` block — it wouldn't compose with the class variant shadcn's components rely on.

**Auth tokens live only in httpOnly cookies, never in JS.** `apps/web/app/api/auth/*`
Route Handlers are the only code that talks to the backend's auth endpoints from the
frontend; they set/read `access_token`/`refresh_token` cookies (names and options in
`apps/web/src/shared/auth/cookies.ts`) and never return tokens in a response body.
`apps/web/src/entities/user/model/session.ts` reads the current user by decoding the access
token's JWT payload (unverified — see the comment in `apps/web/src/shared/auth/token.ts` for
why that's safe here) and **deliberately never refreshes**: a Server Component's `cookies()`
is read-only, so a refresh there would revoke the old refresh token without being able to
persist the new one. Token refresh has exactly one implementation, `POST /api/auth/refresh`,
callable by both `apps/web/proxy.ts` (proactive, when the access token has under 30s left —
see `ACCESS_REFRESH_THRESHOLD_SECONDS`) and client code. `apps/web/proxy.ts` (not
`middleware.ts` — that runs on the Edge runtime, where the module-level dedup `Map` in
`apps/web/src/shared/auth/refresh.ts` wouldn't reliably survive requests) is the only place
that can both run pre-render and write cookies.

### Frontend: Feature-Sliced Design

`apps/web/src` is organized by [FSD](https://feature-sliced.design/): `app → _pages → features
→ entities → shared`, imports flow **down only** (a lower layer never imports a higher one),
and a slice's public surface is its `index.ts` barrel — reach into another slice's internals
(`features/auth-login/ui/login-form.tsx` from outside that slice) and you've broken the
convention, even though nothing enforces it (see below). Slices at the same layer don't import
each other. **There is a `widgets` layer, holding exactly one slice: `widgets/sidebar`** — the
nav shared by `/`, `/categories`, and `/profile`. It earns the layer precisely because it's used
by more than one page; a component used by only one page (e.g. the profile screen's account
card) still belongs as a private, non-barrelled component inside that page's own `_pages/*/ui/`
directory instead. Don't add further `widgets` slices speculatively — the bar stays "genuinely
shared across pages," not "feels reusable."

**Two slices are named with a leading underscore, `_app` and `_pages`, for a Next-specific
reason, not an FSD one.** Next.js routing lives in `apps/web/app` (outside `src`, per Next's
own `src`-folder convention: _"`src/app` or `src/pages` will be ignored if `app` or `pages`
are present in the root directory"_), so the FSD `app` layer is free to live at `src/app`
without colliding — and does, unprefixed. `src/pages`, however, is Next's reserved name for
the (legacy) Pages Router; naming the FSD pages layer `_pages` avoids that collision outright,
and the `_` prefix doubles as Next's own convention for a non-routable private folder. Do not
"clean up" `_pages` back to `pages` — that's not a typo.

**`apps/web/proxy.ts` lives in the app root, not under `src`.** Next's proxy convention
requires it "at the same level as `pages` or `app`" — and since routing is at `apps/web/app`,
that's `apps/web/proxy.ts`. It imports `@/shared/auth` and `@/shared/config` like any other
app code; being outside `src` doesn't change its module resolution (`@/*` still maps to
`./src/*` via `tsconfig.json`).

**Route Handlers under `apps/web/app/api/auth/*/route.ts` keep their full implementation in
the routing tree** — they are not thinned into `_pages`-style re-exports. They import cookie
and token helpers from `@/shared/auth` (notably `setAuthCookies`, shared by login/register/
refresh to set the same two cookies) and `API_URL`/`proxyErrorResponse` from `@/shared/api`.

**`@/shared/auth/refresh.ts` is deliberately not re-exported from `@/shared/auth`'s barrel.**
It's server-only — a module-level in-flight dedup `Map` plus a direct backend call — and
folding it into the barrel would let a client component pull it into the browser bundle by
importing something else from `@/shared/auth`. Its only consumer,
`apps/web/app/api/auth/refresh/route.ts`, imports it directly via `@/shared/auth/refresh`. The
same pattern repeats for `@/shared/api/server-fetch.ts` (the authenticated fetch helper used by
Server Components to call the backend) and for each entity's `api/*.ts` modules
(`entities/transaction/api/*`, `entities/category/api/*`): none of these are re-exported from
their slice's barrel, for the same reason. Be clear that this is a graph-organization
convention, not an enforced boundary — nothing stops a deep import of these modules from a
client component, and the actual hard failure would come from `next/headers` itself refusing to
bundle for the client. `server-fetch.ts` also deliberately does not attempt to refresh an
expired access token — see its own doc comment for why that would silently break login instead
of fixing it.

**No lint rule enforces any of this.** Layer direction and barrel-only imports are convention,
checked by review, not by `eslint.config.mjs`. If violations start recurring, revisit adding
`eslint-plugin-boundaries` (or similar) rather than relying on this paragraph alone.

**The backend e2e suite stubs `PrismaService`** (`apps/backend/test/app.e2e-spec.ts`), so it
runs with no database and no generated client. Keep it that way unless a test genuinely needs
Postgres.

**Injected constructor params must be VALUE imports, never `import { type Foo }`.**

ESLint uses flat config throughout (ESLint 10); app-level `eslint.config.mjs` files just
re-export from `packages/eslint-config`.
