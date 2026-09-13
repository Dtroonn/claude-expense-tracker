---
name: pr
description: Create GitHub pull requests following this repo's Conventional Commits PR title format and required body sections. Use whenever the user asks to open a PR or write a PR title/description.
model: sonnet
---

# Pull request conventions

## Workflow

- **GitHub Flow:** PRs go from a feature branch into `main`.
- Use `gh pr create`.

## PR title

Conventional Commits format, same as commit messages:

```
type(scope): short description
```

Example: `feat(transaction): add transaction module`

## PR body

Must include:

- **Summary** — what changed, based on the diff (bullet points).
- **Test plan** — checkboxes for `pnpm typecheck`, `pnpm lint`, and manual UI checks as
  applicable. (`pnpm test` / `pnpm test:e2e` are out of scope — see repo `CLAUDE.md`.)

Before drafting, review the full diff and commit history for the branch (not just the latest
commit) so the Summary reflects everything included in the PR.

Append any attribution footer required by the current session's system reminders (e.g. the
"Generated with Claude Code" line + session link), if present — do not invent these, use exactly
what the session context specifies.

## Reference

Full project context: repo root `CLAUDE.md`.
