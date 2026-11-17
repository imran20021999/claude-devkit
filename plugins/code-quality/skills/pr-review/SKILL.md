---
name: pr-review
description: Use when reviewing a GitHub pull request (a PR number or URL) — a full PR workflow with a fresh-context code review, PR hygiene checks, a verdict, and optional posting of a summary review plus inline comments. Triggers on "review PR 123", "review this pull request", or the /pr-review command. For a local diff, use quality-review instead.
---

# PR Review

A dedicated pull-request review: fetch it, review it from a fresh context, check PR hygiene, and
(only when asked) post the review back.

## 1. Fetch the PR

- Diff: `gh pr diff <n>`.
- Metadata: `gh pr view <n> --json title,body,baseRefName,mergeStateStatus,statusCheckRollup,files,commits`.
- Use `baseRefName` as the base — **never hardcode `main`/`master`**.

## 2. Deterministic hygiene + CI

- Run `node "${CLAUDE_PLUGIN_ROOT}/hooks/pr-context.mjs" <n>` → PR title/description hygiene, linked
  issue, **commit-message Conventional Commits**, **breaking-change** (signalled but unexplained →
  major), **docs-updated** (code changed but no docs → minor), and **PR-template adherence** (missing
  sections / leftover `<!-- … -->` placeholders) checks. Fold its findings in. A recommended template
  ships at `${CLAUDE_PLUGIN_ROOT}/templates/PULL_REQUEST_TEMPLATE.md` — suggest copying it to
  `.github/PULL_REQUEST_TEMPLATE.md` if the repo has none.
- Enforce PR conventions: the **title must start with a Conventional Commit type** (`feat:` for a
  feature, `fix:` for a bug fix, else `refactor:`/`perf:`/`docs:`/`test:`/`build:`/`ci:`/`chore:`/`revert:`),
  and the **description must substantively explain what changed and why, covering every significant
  change in the diff**. Compare the description against the actual diff — flag it **major** if it omits
  significant changes, **minor** if it's thin or vague.
- If `statusCheckRollup` shows failing CI or `mergeStateStatus` shows conflicts, note it and cap the
  verdict at `NEEDS_WORK`.

## 3. Fresh-context code review (avoid author bias)

Run the actual code review in a **subagent with no prior conversation context**, so the review isn't
biased by having written the code. Give the subagent a self-contained prompt containing:
- the PR diff (or the list of changed files to read),
- the review rules: apply the **quality-review** skill's dimensions and **Evidence Gate**
  (≥80% confidence, `file:line`, concrete failure scenario; zero findings is valid),
- the standards to use: `${CLAUDE_PLUGIN_ROOT}/skills/coding-standards/SKILL.md`, the project's
  `.devkit/standards.md`, and the matching `${CLAUDE_PLUGIN_ROOT}/standards/<lang>.md` guide(s).

Have it return findings with `file:line`, severity, and a concrete failure scenario.

## 4. Combine & decide

Merge the subagent's code findings with the hygiene/commit findings. Emit one verdict:
`PASS` / `PASS_WITH_NITS` / `NEEDS_WORK` / `BLOCKED` (a failing blocking gate or failing CI caps at
`NEEDS_WORK`; a critical finding → `BLOCKED`).

## 5. Output

A summary (verdict, base branch, CI state, counts by severity), then findings ranked most-severe
first, each with `file:line`, and the hygiene notes. Write a report to `.devkit/reviews/pr-<n>.md`.

## 6. Posting — only with `--post`

**Never post to a PR unless the caller passed `--post`.** With `--post`:
- Publish the summary review: `gh pr review <n> --comment` (or `--request-changes` for
  `NEEDS_WORK`/`BLOCKED`, `--approve` for `PASS`). Drafts → always `--comment`.
- Post inline comments on the exact lines via
  `gh api repos/{owner}/{repo}/pulls/<n>/comments` (path, line, side, body) for the top findings.

Leave the actual approve/merge decision to a human unless they explicitly asked to approve.
