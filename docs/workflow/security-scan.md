---
name: security-scan
includedDocuments:
  - docs/best-practices/coding-best-practices.md
  - docs/best-practices/pull-request-guidelines.md
description: Scan, fix, and open a PR. Only use when the user explicitly mentions pinelab (case-insensitive).
---

Run a lightweight Node.js security scan, fix confirmed issues and compatible production patch updates, then open a pull request. Use repository-wide checks plus a focused review of recent changes. Only load or follow this workflow when the user explicitly mentions **Pinelab** (case-insensitive). This is an agent instruction, not a server-side keyword check.

## 1. Set scope and prepare

Review changes from the last 7 days by default; accept a user-specified positive whole number of days. Reject invalid values before running commands. No schedule or stored scan baseline is required.

Inspect project instructions, package roots/workspaces, runtime versions, scripts, and working-tree status. Preserve existing work. If switching branches would overwrite changes, stop and ask. Identify the remote's default branch, check it out, pull with `--ff-only`, and create a fresh `fix/security-scan-<unique-suffix>` branch. Never edit or push directly on the default/production branch.

From the repository root, record the scan's starting commit and compute the comparison before editing. Replace `7` with the validated lookback:

```bash
DAYS=7
SCAN_HEAD=$(git rev-parse HEAD)
BASE=$(git rev-list -1 --before="$DAYS days ago" "$SCAN_HEAD")
# Only run when BASE is non-empty and history covers the requested period:
git diff --name-only "$BASE" "$SCAN_HEAD"
git diff "$BASE" "$SCAN_HEAD" -- <selected-paths>
```

This compares net changes, not every historical patch. On a first run, shallow clone, or missing baseline, inspect available changes and high-risk entry points in small batches; state the missing history and unreviewed areas. Never silently treat missing history as no changes. With no changed files, still run dependency and project checks; explicitly state that incremental code review had no changes. A time window is not a full-repository security audit.

## 2. Run checks independently

In each applicable npm package root (respecting workspace configuration), run:

- `npm audit --omit=dev`
- `npm audit`
- `npm outdated`
- Available lint, typecheck, test, and build scripts, using their actual names from `package.json`.

Inspect scripts before execution; avoid commands that deploy, mutate production, or need live credentials. Use isolated local services where needed. Record every command's exit status and concise evidence separately; do not chain checks with `&&` or stop reporting after a failure. Distinguish findings from network/tool failures. Mark missing or unsafe checks as unavailable/skipped, with reasons. Never run `npm audit fix --force`.

Keep full output outside AI context where possible; read summaries and relevant excerpts. Do not load the entire repository or lockfile. Review changed filenames first, then selected diffs and necessary callers. Inspect authentication/authorization, injection, validation, API/database boundaries, uploads, exposed secrets, and insecure configuration where relevant. Check Node.js support status and risky/unmaintained dependencies. Flag unreviewed high-risk areas; audit output does not prove application security. Never expose secret values in output or reports.

## 3. Investigate updates and fix

Prioritize exploitable production vulnerabilities and broken functionality. Fix confirmed issues with focused changes and regression tests under the included coding rules. Do not fix suspicions as if verified.

Also consider production patch updates within the installed major/minor version; use installed versions and the dependency tree, not only declared ranges. Report routine minor/major updates without applying them. Compatible updates for confirmed vulnerabilities may go beyond patches, but require the same investigation below.

Before **every** dependency update, inspect official changelogs/release notes for the entire installed-to-target range, linked migration guides, engine requirements, and relevant advisories. Patch labels do not guarantee safety. Record source links and findings. If release information is unavailable or inconclusive, defer the update. Database migrations, breaking changes, credential rotation, and operational/product decisions require explicit approval before proceeding; report and defer those items while continuing safe work. Never run migrations against live systems.

Update the manifest and lockfile together using the project's package manager. Avoid unrelated lockfile churn. Follow the included coding guidance for test approval and test-first fixes; obtain any missing scenario approval without reopening already agreed cases. Run relevant regression checks after each fix/update and the available final checks. Report pre-existing failures separately. Do not describe an unverified fix as validated.

## 4. Report and open a PR

Return a concise report in the conversation with scan commit, lookback/baseline, check statuses, skipped checks, and coverage limits. Separate confirmed findings from suspected risks. Use a P0–P3 table: issue, evidence (file/line or command excerpt), impact, recommended fix, estimated effort, and disposition (fixed/deferred).

P0 means critical security; P1 high security or broken functionality; P2 moderate risk/maintenance; P3 minor improvements. Include relevant bugs, missing tests, duplication, and performance findings at lower priority without expanding into unrelated cleanup.

Review the diff for secrets and unrelated/generated artifacts. Remove temporary plan files created for this task, not pre-existing user files. Commit and push only intended fixes on the feature branch, then create a PR following the included PR guidelines. Do not merge or deploy. With no fixes, return the report without an empty commit or PR. If checks or PR creation fail, report the blocker and actual completion state.

The PR must document **each dependency's old → new version, changelog/release-note links, relevant changes, migration and breaking-change findings, operational steps, and test results**. Explicitly say when no migrations or breaking changes were identified and note uncertainty. Keep the description within the PR guidelines' limit; place a larger dependency table/report in a linked PR comment. Include deferred updates and approval requirements. Return the PR link and reproduction commands. Scheduling remains outside this workflow.
