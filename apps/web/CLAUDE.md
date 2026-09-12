@AGENTS.md

## Architecture

### Feature-Sliced Design

`apps/web/src` follows [FSD](https://feature-sliced.design/): `app → _pages → widgets →
features → entities → shared`. Imports flow **down only**; slices at the same layer don't
import each other; a slice's public surface is its `index.ts` barrel. **Nothing enforces this**
— no lint rule checks layer direction or barrel-only imports, it's caught in review. If
violations start recurring, add `eslint-plugin-boundaries` rather than relying on this
paragraph.

- `widgets` holds exactly one slice, `widgets/sidebar`, because more than one page uses it. A
  component used by one page belongs in that page's own `_pages/*/ui/`, unbarrelled. Don't add
  `widgets` slices speculatively — the bar is "genuinely shared across pages," not "feels
  reusable."
- `_app` and `_pages` are underscore-prefixed to avoid Next's reserved `src/pages`. Not a typo
  — don't "fix" them. (Next routing lives in `apps/web/app`, outside `src`, so the FSD `app`
  layer sits unprefixed at `src/app`.)
- `apps/web/proxy.ts` must live in the app root, not under `src` (Next requires it beside
  `app/`). `@/*` still resolves to `./src/*` there.
- Route Handlers under `apps/web/app/api/auth/*/route.ts` keep their full implementation in the
  routing tree — not thinned into re-exports.
- **Server-only modules are deliberately not barrelled**: `@/shared/auth/refresh.ts`,
  `@/shared/api/server-fetch.ts`, and each entity's `api/*.ts`. Import them by deep path so a
  client component can't pull them into the browser bundle via an unrelated barrel import. This
  is graph organization, not an enforced boundary — the hard failure would come from
  `next/headers` refusing to bundle for the client.

### Data flow

Server Components fetch through an entity's `api/*.ts`, which calls `serverFetch` — it reads the
httpOnly access cookie and attaches it as a Bearer token, so it's Server Component / Route
Handler only. It throws `UnauthorizedError` on a missing cookie or a backend 401; the caller
decides the routing response (`redirect(ROUTES.login)`), keeping route policy out of the fetch
layer. Responses are **cast** to the shared DTO type, never re-parsed — the backend already
validated them. Frontend zod is only for user input: react-hook-form `zodResolver` over a
shared schema (`features/auth-*/model/schema.ts`).

`next.config.ts` lists `@expense-tracker/shared` in `transpilePackages` so its output runs
through Next's SWC pass (Next doesn't transpile workspace packages by default).

## Non-obvious constraints

**Auth tokens live only in httpOnly cookies, never in JS.** `apps/web/app/api/auth/*` Route
Handlers are the only frontend code that talks to the backend's auth endpoints; they set/read
`access_token`/`refresh_token` (see `@/shared/auth/cookies.ts`) and never return tokens in a
body. `entities/user/model/session.ts` decodes the access token's payload unverified and
**never refreshes** — a Server Component's `cookies()` is read-only, so refreshing there would
revoke the old token without persisting the new one, logging the user out permanently.
`serverFetch` doesn't refresh either, for the same reason. Refresh has exactly one
implementation, `POST /api/auth/refresh`, called by `apps/web/proxy.ts` (proactively under
`ACCESS_REFRESH_THRESHOLD_SECONDS`) and by client code. It must stay in `proxy.ts`, not
`middleware.ts`: the Edge runtime wouldn't preserve the dedup `Map` in
`@/shared/auth/refresh.ts`.

**`proxy.ts`'s `matcher` and `PROTECTED_PATHS` must be kept in sync by hand.** The matcher has
to be statically analysable, so it can't be derived from `@/shared/config/routes.ts`. A
protected route missing from the matcher gets no proactive refresh, and its `serverFetch` calls
start 401ing once the access token goes stale. `isProtected`'s `path !== '/'` guard is
load-bearing too — without it every path matches `ROUTES.home` and `/login` redirect-loops.

**Tailwind v4 has no `tailwind.config.js`.** Tokens live in
`apps/web/src/app/styles/globals.css` (shadcn init, Radix base / Nova preset): raw values in
`:root`/`.dark`, mapped via `@theme inline`. Dark mode is **class-based**
(`@custom-variant dark (&:is(.dark *))` + `next-themes`, with `suppressHydrationWarning` on
`<html>` since the class lands before hydration); don't reintroduce a
`@media (prefers-color-scheme: dark)` block — it won't compose with shadcn's components.
