---
name: pr
description: Create GitHub pull requests following this repo's Conventional Commits PR title format and required body sections. Use whenever the user asks to open a PR or write a PR title/description.
model: sonnet
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git push:*), Bash(gh pr create:*), Bash(gh pr view:*)
argument-hint: '[title] [branch]'
---

# Pull request conventions

## Arguments

- $0 - title of PR
- $1 - target branch

## Workflow

1. Execute (`git branch --show-current`)
2. throw an error if the current brunch is main
3. Verify existing the current brunch remotely.
4. Push the branch, using `git push origin <$1>` if it does not exist
5. Use $0 for PR title if it is given
6. if $0 is imitted , then derive the title from the diff/commit history per the conventions below(Section PR Title).
7. Create PR body, using the instructions below(Section PR Body).
8. - Use `gh pr create`.

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
