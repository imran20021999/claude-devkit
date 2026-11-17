---
description: Full review of a GitHub pull request — fresh-context code review, PR hygiene and commit-message checks, a verdict, and optional posting of a summary + inline comments.
argument-hint: "<PR number | url> [--post] [--fix]"
---

Review the pull request in `$ARGUMENTS` following the **pr-review** skill. Also apply the
**quality-review** methodology and **coding-standards** (plus matching language guides).

Steps:
1. Fetch the PR: `gh pr diff <n>` and `gh pr view <n> --json title,body,baseRefName,mergeStateStatus,statusCheckRollup,files,commits`. Use `baseRefName` as the base — never hardcode `main`.
2. Hygiene + commits: `node "${CLAUDE_PLUGIN_ROOT}/hooks/pr-context.mjs" <n>`; fold in the title/description, linked-issue, and Conventional Commit findings. If CI is failing or there are conflicts, cap the verdict at `NEEDS_WORK`.
3. Gates: run `node "${CLAUDE_PLUGIN_ROOT}/hooks/run-gates.mjs" <changed files>` on the PR's changed files.
4. **Fresh-context review:** dispatch a subagent (no prior context) with the diff + the Evidence Gate rules + the standards/guide paths; have it return findings with `file:line` and a concrete failure scenario.
5. Combine code findings + hygiene findings → one verdict (`PASS` / `PASS_WITH_NITS` / `NEEDS_WORK` / `BLOCKED`). Write a report to `.devkit/reviews/pr-<n>.md`.
6. `--fix` → apply only safe, mechanical fixes.
7. `--post` → publish the review with `gh pr review <n>` (`--comment` / `--request-changes` / `--approve` per verdict) and inline comments via `gh api`. **Only post when `--post` is given**; never approve/merge on your own initiative.
