---
name: component-tests
description: Write React Testing Library tests for a single frontend component in apps/web. Use whenever the user asks to add/write tests for a component file.
model: sonnet
allowed-tools: Bash(pnpm:*), Read, Write, Edit, Glob, Grep
argument-hint: '[component-file]'
arguments:
  - name: component-file
    description: Path to the component file to write tests for (e.g. src/features/auth-login/ui/login-form.tsx)
    required: true
---

# Component tests (React Testing Library)

## Arguments

- $component-file — path (relative to `apps/web`, or absolute) to the component to test.
  If omitted, ask the user which component to test — do not guess.

## Workflow

1. Resolve `$component-file` to an actual file under `apps/web`. If it doesn't exist, stop and
   tell the user.
2. Read the component fully, and read any hooks/helpers it imports from the same feature/entity
   slice, so the tests reflect real behavior, not guesses.
3. Check whether the test toolchain is already set up in `apps/web` (see **Toolchain setup**
   below). Set it up only if missing.
4. Look for an existing test as a style reference (`**/*.test.tsx` under `apps/web`) before
   writing the first one, so conventions stay consistent across the app.
5. Write the test file next to the component: `<component-name>.test.tsx` in the same directory.
6. Run the new test with `pnpm --filter @expense-tracker/web test -- <component-name>` (or the
   project's actual test script — see below) and fix failures before finishing.
7. This repo's `CLAUDE.md` marks testing "out of scope" for CI/workflow purposes — that does not
   apply here since the user explicitly asked for this test. Don't expand scope beyond the
   requested component (no snapshot suites, no unrelated components).

## Toolchain setup (only if missing)

`apps/web` has no test runner configured yet as of this writing. If `apps/web/package.json` has
no `test` script / no Vitest or Jest config:

1. Add Vitest + React Testing Library (preferred for a Next.js 16 / React 19 / Vite-less app):
   `pnpm --filter @expense-tracker/web add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`
2. Add a `test` script to `apps/web/package.json`: `"test": "vitest run"`.
3. Add a minimal `apps/web/vitest.config.ts` (jsdom environment, React plugin, path aliases
   matching `tsconfig.json`).
4. Add `apps/web/vitest.setup.ts` importing `@testing-library/jest-dom`, wired via `setupFiles`.
5. Never introduce a second test runner if one already exists (e.g. if Jest is already configured
   for `apps/web`, extend that instead of adding Vitest).

## Writing the tests

- Import from `@testing-library/react` (`render`, `screen`) and `@testing-library/user-event`
  for interactions — never `fireEvent` unless simulating an event `userEvent` can't (e.g. raw
  paste).
- Query by role/label/text the way a user would (`getByRole`, `getByLabelText`) — avoid
  `getByTestId` unless the element has no accessible role/text.
- Follow this repo's shared-contract convention: if the component consumes data typed via
  `packages/shared` zod schemas, build test fixtures using those inferred types rather than
  hand-rolled interfaces.
- If the component uses `react-hook-form` + `zodResolver` (see `auth-login`/`auth-register`
  features for reference), test validation errors by submitting invalid input and asserting the
  rendered error message, not by inspecting form internals.
- Mock only true external boundaries (network calls, `next/navigation`, `next/router`) — never
  mock the component's own child components or internal hooks.
- Cover: default render, user interactions that change output, conditional/edge states (loading,
  error, empty), and any accessibility-relevant behavior (labels, roles) the component defines.
- Keep one test file per component; do not add tests for child/child components imported by it.

## After writing

- Run `pnpm --filter @expense-tracker/web typecheck` and the test command; fix any failures.
- Report back which file was created/updated and the test run result.
