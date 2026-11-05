---
name: Upgrading Vendure Safely
description: Upgrade Vendure dependencies, review schema and data migrations for data loss, and verify backups, staging checks, rollout, and recovery before production.
category: data
---

Upgrade Vendure by aligning its packages, reviewing every migration, and rehearsing the release on an isolated database copy before production. This guide covers dependency, schema, and data changes. It does not authorize a deployment or migration execution.

Follow [Vendure best practices](../best-practices/vendure-best-practices.md) when changing Vendure configuration or plugins, and [coding best practices](../best-practices/coding-best-practices.md) before writing code or tests.

## 1. Investigate and agree on scope

1. Check project instructions, working-tree status, package manager, installed versions, Node.js runtime, database engine/version, migration scripts, and deployment process. Preserve unrelated work and use a task branch.
2. Select an explicit target release. Read the official [updating guide](https://docs.vendure.io/current/framework/developer-guide/updating-vendure/), [release notes](https://github.com/vendurehq/vendure/releases), and changelog for the entire installed-to-target range. Record source links and relevant breaking changes, including patch releases.
3. Check plugin compatibility, runtime requirements, custom authentication, checkout, background jobs, email templates, and dashboard extensions. Separate required compatibility changes from unrelated updates.
4. Agree on regression coverage and obtain explicit permission for migration generation, execution, and deployment separately. If generation is excluded, document migration requirements without generating files. Do not bypass dependency release-age policies without approval.

## 2. Update dependencies

From the application's package root, run its existing tests and type/build checks to establish a baseline. Record failures and unavailable dependencies.

Update all installed first-party `@vendure/*` release packages to the same target version, using the project's package manager. Update the manifest and lockfile together. Inspect any compatibility exceptions explicitly documented by Vendure. Upgrade third-party plugins only where required or agreed. Do not combine this with an optional ORM major upgrade.

Reinstall, check dependency resolution, and rebuild the server and dashboard using the project's actual scripts. Keep required generated artifacts; inspect patches and avoid unrelated lockfile changes. Passing compilation does not prove runtime compatibility.

## 3. Generate and review migrations

Only with approval, generate against an isolated copy of the current deployed schema, using the same database engine/version and relevant settings. Use the project's configured migration-generation script; verify its output directory and database target first. Never infer safety from an empty migration directory.

Read **every statement in both `up()` and `down()`**, including imported helpers:

- Reject unexplained `DROP TABLE`, `TRUNCATE`, `DELETE`, or column drops. A `DROP COLUMN` followed by `ADD COLUMN` destroys existing values, even when the name stays the same. This can erase addresses, payment configuration, promotions, tax lines, or invoice data.
- Investigate apparent type/collation drift. If a conversion is required, use a reviewed data-preserving alteration; check lengths, encoding, nullability, defaults, and index constraints first. Narrowing `MEDIUMTEXT` to `TEXT` can truncate data or fail. Do not blindly remove generated changes either.
- Review removed unique indexes and foreign keys for lost integrity guarantees. New unique constraints can fail on duplicates; new foreign keys can fail on orphaned rows. `ON DELETE CASCADE` changes future deletion behavior.
- Check release-specific data migrations separately from schema generation. For example, Vendure 3.8 translation deduplication deletes duplicate rows, while historical partially cancelled order lines may require `rescaleOrderLinePromotionAdjustments` in the same deployment. Consult that release's guide for applicability and ordering.

A rollback migration cannot restore deleted values. MySQL DDL may implicitly commit, so a transaction is not a recovery plan.

## 4. Rehearse before production

1. Take a backup and prove it can be restored. Protect sensitive data and disable outbound email, payments, webhooks, fulfillment integrations, and production queues in the isolated environment.
2. With approval, run the reviewed migrations on the restored copy. Record execution time, locks, errors, and schema results. Verify expected columns, indexes, constraints, and migration history.
3. Compare before/after row counts and representative critical values. Expect no unexplained loss; account explicitly for approved deduplication. Verify application reads/writes through public APIs, not just database structure.
4. Run agreed tests and manually check login/SSO, checkout totals and shipping eligibility, payment/refund flows, promotions, invoices, dashboard, and workers as applicable. For scheduled metrics, run the task and verify stored charts through the dashboard/API. Classify every failure; do not dismiss it as an upgrade side effect.
5. Confirm no unexpected schema drift remains using the project's supported schema-check process. Test recovery, not merely whether `down()` runs.

## 5. Prepare rollout and handover

Before an approved production migration, take a fresh recoverable backup, set a maintenance/write-freeze plan, stop incompatible workers, and agree on ordering, downtime, monitoring, and rollback triggers. Do not run old and new application versions together unless compatibility is established. Confirm whether rollback requires restoring the backup and how writes since that backup will be handled.

Document old → new versions, sources, destructive operations, schema/data requirements, exact approved commands, test results, skipped checks, recovery steps, and operational changes such as administrator re-login. Unverified migrations or failing critical flows block a deployment-ready claim.
