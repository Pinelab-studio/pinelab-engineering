---
name: Node.js Security Scan and Dependency Updates
description: Scan every Node.js package.json project, investigate dependency updates, and open a separate pull request per project with fixes, risks, and breaking changes.
---

Run a lightweight Node.js security scan for every project with its own `package.json`, fix confirmed issues and compatible production patch updates, then open a separate pull request per project with fixes. Use repository-wide discovery plus project-scoped checks and a focused review of recent changes. In a monorepo, “project” means a directory with its own `package.json` within the same Git repository, not a separate Git repository. Scan only the current repository; all project branches and PRs target that same repository.

## 1. Set scope and prepare

Review changes from the last 7 days by default; accept a user-specified positive whole number of days. Reject invalid values before running commands. No schedule or stored scan baseline is required.

Inspect project instructions, package roots/workspaces, runtime versions, scripts, and working-tree status. Discover every tracked `package.json`, including nested projects and workspace packages; exclude installed dependencies and generated/vendor directories. Record each project's path and workspace/lockfile ownership. Scan every discovered project, not just the repository root or the first package found. For example, `api/package.json` and `storefront/package.json` require two scans and, when both need fixes, two PRs.

Preserve existing work. If switching branches would overwrite changes, stop and ask. Identify the remote's default branch, check it out, and pull with `--ff-only`. For each project needing changes, create a fresh `fix/security-scan-<project>-<unique-suffix>` branch from the updated default branch, never from another project's scan branch. Never edit or push directly on the default/production branch.

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

For every discovered project, run the following from its package root, or from its workspace root with the appropriate workspace selector where supported:

- `npm audit --omit=dev`
- `npm audit`
- `npm outdated`
- Available lint, typecheck, test, and build scripts, using their actual names from `package.json`.

Inspect scripts before execution; avoid commands that deploy, mutate production, or need live credentials. Use isolated local services where needed. Record every command's exit status and concise evidence separately; do not chain checks with `&&` or stop reporting after a failure. Distinguish findings from network/tool failures. Mark missing or unsafe checks as unavailable/skipped, with reasons. Never run `npm audit fix --force`.

Keep full output outside AI context where possible; read summaries and relevant excerpts. Do not load the entire repository or lockfile. Review changed filenames first, then selected diffs and necessary callers. Inspect authentication/authorization, injection, validation, API/database boundaries, uploads, exposed secrets, and insecure configuration where relevant. Check Node.js support status and risky/unmaintained dependencies. Flag unreviewed high-risk areas; audit output does not prove application security. Never expose secret values in output or reports.

## 3. Investigate updates and fix

Prioritize exploitable production vulnerabilities and broken functionality. Fix confirmed issues with focused changes and regression tests under the project's coding rules. Do not fix suspicions as if verified.

Also consider production patch updates within the installed major/minor version; use installed versions and the dependency tree, not only declared ranges. Report routine minor/major updates without applying them. Compatible updates for confirmed vulnerabilities may go beyond patches, but require the same investigation below.

Before **every** package update, read that package's official changelog for the entire installed-to-target range, along with release notes, linked migration guides, engine requirements, and relevant advisories. Patch labels do not guarantee safety. Record source links and findings. If release information is unavailable or inconclusive, defer the update. Database migrations, breaking changes, credential rotation, and operational/product decisions require explicit approval before proceeding; report and defer those items while continuing safe work. Never run migrations against live systems.

Update the manifest and lockfile together using the project's package manager. Keep each project's fixes on its own branch. For workspaces sharing a lockfile, use workspace-aware commands and include only lockfile changes required by that project's fixes; do not mix other projects' manifest updates into the PR. If a fix cannot be isolated safely, report the coupling and ask before combining projects. Avoid unrelated lockfile churn. Follow the project's coding guidance for test approval and test-first fixes; obtain any missing scenario approval without reopening already agreed cases. Run relevant regression checks after each fix/update and the available final checks. Report pre-existing failures separately. Do not describe an unverified fix as validated.

## 4. Report and open a PR

Return a concise report in the conversation covering every discovered project by path, with scan commit, lookback/baseline, check statuses, skipped checks, and coverage limits. Identify projects with no fixes or blocked checks explicitly so none are silently omitted. Separate confirmed findings from suspected risks. Use a P0–P3 table: issue, evidence (file/line or command excerpt), impact, recommended fix, estimated effort, and disposition (fixed/deferred).

P0 means critical security; P1 high security or broken functionality; P2 moderate risk/maintenance; P3 minor improvements. Include relevant bugs, missing tests, duplication, and performance findings at lower priority without expanding into unrelated cleanup.

Review the diff for secrets and unrelated/generated artifacts. Remove temporary plan files created for this task, not pre-existing user files. For each project with fixes, commit and push only that project's intended changes on its separate feature branch, then create a separate PR following the project's PR guidelines. Identify the project path in each PR. Do not merge or deploy. For projects with no fixes, return their reports without empty commits or PRs. If one project's checks or PR creation fail, report its blocker and actual completion state, and continue scanning the remaining projects.

The PR must document **each dependency's old → new version, changelog/release-note links, relevant changes, migration and breaking-change findings, operational steps, and test results**. For each upgraded dependency, explicitly state `Breaking changes: <details>` or `breaking: none` when none were identified. Explicitly say when no migrations were identified and note uncertainty. Keep the description within the PR guidelines' limit; place a larger dependency table/report in a linked PR comment. Include deferred updates and approval requirements. Return all PR links mapped to their project paths, with reproduction commands for each project. Scheduling remains outside this recipe.
