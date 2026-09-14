---
name: standup
description: Analyze all repo changes from the last 24 hours (commits, diffs, branches) and produce a simple, plain-language report in Russian for business stakeholders, saved as a markdown file under .claude/reports. Use whenever the user asks for a standup, daily report, or summary of recent work.
model: sonnet
context: fork
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git show:*), Bash(git status:*), Bash(git branch:*), Bash(git shortlog:*), Read, Write, Glob, Grep
disable-model-invocation: true
---

# Standup report

Gather all repository changes from the last 24 hours and turn them into a simple report **written
in Russian** for people without a technical background (managers, business stakeholders). The
report itself must contain no technical jargon (commit, diff, PR, branch, merge, backend/frontend
as raw terms, etc.) — only plain-language descriptions of what was done and why, in Russian.

## Gathering data (technical step — this part is not what goes into the report verbatim)

1. Determine the time window: the last 24 hours.
2. Collect raw data with git:
   - `git log --all --since="24 hours ago" --pretty=format:"%h|%an|%ad|%s" --date=iso`
   - `git diff --stat` / `git show --stat <hash>` — which parts of the product were touched.
   - `git branch -a --sort=-committerdate` — what else is in progress.
   - If there are no changes in the last 24 hours, say so plainly in the report instead of
     fabricating activity.
3. Read the actual changes (`git show <hash>`) to understand the real meaning and motivation,
   not just restate the raw log message.
4. Translate the technical details into business meaning:
   - What it means for the user or the product (a new capability, a fixed problem, "under the
     hood" work the user won't notice directly but that supports stability/future features).
   - Which part of the product was affected — instead of "backend/apps/web", describe it in
     plain terms (e.g. "server-side logic", "the website/what the user sees"), in Russian.
   - If a technical term is unavoidable, briefly explain it in everyday language.
5. Save the report to `.claude/reports/standup-<YYYY-MM-DD>.md` (create the folder if missing).

## Report structure

The report content itself must be written in Russian. Structure it as follows (section headings
below are described in English for the skill author, but write the actual headings and content
in Russian when producing the report):

- **Title** — "Отчёт за <DD.MM.YYYY>" (today's date).
- **Summary section** (heading: "Коротко") — a detailed but simple multi-paragraph description of
  what happened during the day, as if explaining to a non-technical colleague what the team
  worked on and why it matters. Do not use words like "коммит", "диф", "пул-реквест", "мердж",
  etc. Call out risks or unfinished work if any.
- **Changes section** (heading: "Что изменилось") — bullet points, plain language: what was done
  and why it matters (value for the product/user/business).
- **Fixed issues section** (heading: "Исправленные проблемы") — if any: what was broken and what
  works better now.
- **Internal work section** (heading: "Внутренняя работа") — brief: "under the hood" work (code
  cleanup, documentation, process setup), no technical detail — just note it happened and why
  (stability, faster future work).
- **No-changes case**: if there were no changes in the last 24 hours, state that explicitly in
  Russian (e.g. "За последние 24 часа изменений в проекте не было.") instead of fabricating
  content.

## Rules

- Write the report content only in Russian.
- No git jargon in the report text: never write "commit", "diff", "PR", "branch", "merge",
  "backend", "frontend" — replace them with plain Russian equivalents appropriate to context
  ("серверная часть", "сайт/интерфейс", "изменение", "ветка разработки", etc.).
- Do not invent results or metrics that aren't in the data.
- Keep most sections short and bullet-based, but the "Коротко" (Summary) section must give a
  full picture of the day, not just 1-2 sentences.
- After saving the file, report back its path.
