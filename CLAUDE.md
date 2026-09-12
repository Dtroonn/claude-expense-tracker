## Project overview

Expense Tracker - Monorepo with pnpm workspaces containing a Next.js frontend and NestJS backend.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind v4
- **Backend:** NestJS 11, Prisma 7, CQRS
- **Monorepo:** Turborepo, `pnpm` workspace (`apps/web`, `apps/backend`, `packages/shared`)

## Commands

Run from the repo root; they fan out through Turborepo.

```bash
pnpm install                # deps are NOT installed in a fresh clone
cp .env.example .env        # feeds both docker-compose and Prisma
pnpm db:up                  # needs Docker Desktop running
pnpm db:generate            # REQUIRED after clone — generated client is gitignored
pnpm dev                    # web :3000, backend :3001
```

`pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm format` · `pnpm db:migrate` ·
`pnpm db:studio` · `pnpm test` · `pnpm test:e2e`

Single app / single test:

```bash
pnpm --filter @expense-tracker/web dev
pnpm --filter @expense-tracker/backend test -- -t "returns a health payload"
```

Workspaces are `@expense-tracker/{web,backend,shared,tsconfig,eslint-config}` — the backend is
`backend`, not `api`.

## Workflow & Git

- **GitHub Flow:** Branch from `main`, never commit directly to `main`.
<important if="need to write a commit or a title for PR">
- [Conventional Commits](https://www.conventionalcommits.org/) for commit messages **and** PR
titles (`feat(transaction): add transaction module`). History predates this; apply going
forward.
</important>
- **PRs:** Use `gh pr create`. Body must include a **Summary** (what changed based on diff) and a **Test plan** (checkboxes for `pnpm typecheck`, `pnpm lint`, and manual UI checks).
- **Testing:** Out of scope currently. `pnpm test` / `pnpm test:e2e` fail because the Prisma
  generator emits `.ts` sources with `.js` import specifiers that Jest can't resolve — expected,
  not a regression (details in `apps/backend/CLAUDE.md`). Rely on `pnpm typecheck` and `pnpm lint`.

## Architecture

```
apps/web        Next.js 16 App Router, React 19, Tailwind v4   :3000
apps/backend    Nest.js 11 + Prisma 7                          :3001, routes under /api
packages/shared zod contracts imported by BOTH apps
packages/{tsconfig,eslint-config}
```

**Shared contracts are the spine.** `packages/shared` defines a zod schema and exports it plus
the inferred type (`src/health.ts` is the reference). The backend `.parse()`s responses through
it; the frontend imports the type and **casts** (`as AuthResponseDto`) instead of re-parsing —
the backend already validates both directions (global `ZodValidationPipe`, `@ZodResponse`).
Frontend zod is only for user input the backend hasn't seen: react-hook-form `zodResolver`
reusing the shared schemas. Never hand-write duplicate interfaces on either side.

`packages/shared` builds with `tsup` (cjs for Nest, esm for Next, `dts: false` — `types` points
at `src/index.ts`). Root `build`/`lint`/`typecheck`/`test` rebuild it automatically; `dev` does
**not** — after editing `packages/shared/src` while `pnpm dev` runs, rebuild it manually
(`pnpm --filter @expense-tracker/shared build`, or run its `dev` alongside for `tsup --watch`)
since consumers read `dist`. Jest needs its own `moduleNameMapper` for it — it doesn't resolve
package `exports`.

## Non-obvious constraints

**TypeScript is pinned to exactly `5.9.3` everywhere.** `@nestjs/cli@11` bundles TS 5.7 and
depends on `emitDecoratorMetadata`. Don't bump to 7.x until Nest supports it.

ESLint is flat config throughout (ESLint 10); app-level `eslint.config.mjs` files just
re-export from `packages/eslint-config`.
