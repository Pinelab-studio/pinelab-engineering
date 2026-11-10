---
name: Node.js Security Scan and Dependency Updates
description: Scan every Node.js package.json project, investigate dependency updates, and open a separate pull request per project with fixes, risks, and breaking changes.
---

Scan every Node.js `package.json` project in the current Git repository, fix confirmed issues and production patches, and open one PR per changed project. In monorepos, projects are directories, not separate Git repositories; all branches/PRs belong to this repository.

## 1. Discover projects and establish a baseline

Load [coding best practices](../best-practices/coding-best-practices.md) before fixes or tests. Inspect project instructions, runtime versions, scripts, and workspace/lockfile ownership. Discover every tracked `package.json`, including nested projects and workspace packages; exclude dependencies and generated/vendor directories. Example: `api/package.json` and `storefront/package.json` need two scans and, if both need fixes, two PRs.

Preserve existing work; stop and ask if switching branches would overwrite it. Identify the remote's default branch, check it out, and pull with `--ff-only`. Never edit or push directly on the default/production branch.

Review the last 7 days unless given another positive whole number; reject invalid values before commands. From the repository root, record the baseline before editing:

```bash
DAYS=7 # Replace with validated lookback
SCAN_HEAD=$(git rev-parse HEAD)
BASE=$(git rev-list -1 --before="$DAYS days ago" "$SCAN_HEAD")
# Run only when BASE exists and history covers the requested period:
git diff --name-only "$BASE" "$SCAN_HEAD"
git diff "$BASE" "$SCAN_HEAD" -- <selected-paths>
```

This compares net changes, not historical patches. With missing/shallow history, inspect available changes and high-risk entry points; report coverage gaps. With no changed files, still run checks and report no incremental changes. Full audits, scheduling, and stored baselines are outside scope.

## 2. Scan every project

From each package root, or its workspace root using supported workspace selectors, run independently:

- `npm audit --omit=dev` — production vulnerabilities.
- `npm audit` — all dependency vulnerabilities.
- `npm outdated`.
- Available lint, typecheck, test, and build scripts, using actual names.

Inspect scripts first. Skip deployment, production mutation, or live-credential requirements; use isolated services. Record each command's exit status and concise evidence, distinguishing findings from tool/network failures. Explain skipped checks. Do not chain checks with `&&` or stop after failures; continue remaining projects when one is blocked.

Read summaries and selected diffs/callers, not entire repositories, lockfiles, or command output. Review authentication/authorization, injection, validation, API/database boundaries, uploads, secrets, and configuration where relevant. Check Node.js support and risky/unmaintained dependencies. Never expose secret values. Flag unreviewed high-risk areas; clean audit output does not prove application security.

## 3. Investigate and fix per project

Prioritize confirmed exploitable vulnerabilities and broken functionality, not suspicions. Also consider production patches within the installed major/minor version, using installed versions and the dependency tree. Report routine minor/major updates without applying them; vulnerability fixes may exceed patches.

Before editing, create `fix/security-scan-<project>-<unique-suffix>` from the updated default, never another project's branch. Update manifests/lockfiles together using the project's package manager. For shared lockfiles, use workspace-aware commands scoped to this project's fixes. Avoid unrelated churn; ask before combining inseparable projects.

For npm projects, preview compatible fixes with `npm audit fix --dry-run --json`. Before **every** update, inspect official changelogs across the installed-to-target range, release notes, linked migration guides, engine requirements, and advisories. Record sources; defer unavailable or inconclusive release information. Patch labels do not guarantee safety.

After investigation:

```bash
npm audit fix         # Apply compatible vulnerability fixes
```

If vulnerabilities remain and require breaking updates, preview with `npm audit fix --force --dry-run --json`, investigate as above, then run:

```bash
npm audit fix --force # Allow breaking vulnerability fixes
```

Dependency breaking changes need no separate approval; make necessary application adjustments and document them. Database migrations, credential rotation, and operational/product decisions still require approval: defer those items while continuing safe work. Never run live migrations.

Follow coding guidance for regression tests, scenario approval, and test-first fixes. After each fix/update, rerun relevant checks; finish with audits and available project checks. Separate pre-existing failures, unresolved vulnerabilities, and unverified fixes from validated results.

## 4. Report and open project PRs

Report every project by path, including scan commit, lookback/baseline, check statuses, skipped checks, coverage limits, and no-fix/blocked outcomes. Separate confirmed findings from suspected risks. Use a table: priority, issue, evidence (file/line or command excerpt), impact, recommended fix, effort, disposition (fixed/deferred).

Priorities: P0 critical security; P1 high security/broken functionality; P2 moderate risk/maintenance; P3 minor improvements. Include relevant bugs, missing tests, duplication, and performance findings without unrelated cleanup.

Review diffs for secrets and unrelated/generated artifacts; remove only temporary plan files created for this task. Commit/push intended fixes and create one PR per changed project following [PR guidelines](../best-practices/pull-request-guidelines.md). Identify the project path. No fixes means no empty commit/PR. Do not merge or deploy; report actual completion and blockers.

For each upgraded dependency, document old → new version, release links, relevant changes, `Breaking changes: <details>` or `breaking: none`, migration findings (explicitly state none or uncertainty), operational steps, and test results. Include deferred updates/approvals. Respect the PR description limit; link larger reports in a PR comment. Return PR links by project and reproduction commands.
