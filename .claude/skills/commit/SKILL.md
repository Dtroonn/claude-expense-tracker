---
name: commit
description: Create git commits following this repo's Conventional Commits + GitHub Flow rules. Use whenever the user asks to commit changes or write a commit message.
model: sonnet
---

# Commit conventions

## Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description
```

Example: `feat(transaction): add transaction module`

- Scope is typically a workspace/module name (`transaction`, `web`, `backend`, `shared`).
- History predates this convention — don't rewrite old commits, just apply it going forward.
- Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `build`, `ci`.

## Before committing

1. Run `git status` and `git diff` (staged + unstaged) to see everything that will be committed.
2. Run `git log` to confirm recent message style if unsure.
3. Draft a concise message focused on **why**, not just what changed.
4. Double-check no secrets/credentials are being staged, even in innocuous-looking files.

## Commit message template

```
git commit -m "$(cat <<'EOF'
type(scope): short description

Optional body explaining why, if non-obvious.
EOF
)"
```

Append any attribution lines required by the current session's system reminders (e.g.
`Co-Authored-By:` / `Claude-Session:`), if present — do not invent these, use exactly what the
session context specifies.

## Reference

Full project context: repo root `CLAUDE.md`.
