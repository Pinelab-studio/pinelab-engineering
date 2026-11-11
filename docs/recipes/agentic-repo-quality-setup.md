---
name: Pinelab Repo setup
description: Set up repository quality checks, isolated tests, CI, and concise agent instructions for better automated quality assurance.
category: infrastructure
---

Set up a repository for agent-assisted development with automated quality checks, isolated tests, and clear completion commands. Use Biome, Knip, and Dependency Cruiser for JavaScript/TypeScript; agree equivalent tools for other stacks. This recipe applies across Pinelab repositories when setup is explicitly requested. It excludes dotenvx, deployment, broad dependency upgrades, security scanning, coverage thresholds, and unrelated refactoring.

## 1. Inspect and agree

Before changes, load `get_coding_best_practices`; also load `get_vendure_best_practices` for Vendure work. These MCP tools provide the existing coding and testing rules.

Inspect `AGENTS.md`, package roots, package managers, lockfiles, runtime versions, scripts, frameworks, generated files, and CI. Run existing checks from each owning package root and record baseline failures. Ask before replacing existing tooling. Agree architectural boundaries from the current repository, rather than imposing another project's folder layout. Report existing violations and agree cleanup scope before fixing them. Agree initial test scenarios; setup is not a full regression-testing project.

## 2. Install and configure quality tools

Use versions compatible with the repository's runtime. Preserve its package manager and lockfile ownership. For an npm package, run from its package root:

```bash
npm install --save-dev @biomejs/biome knip dependency-cruiser
```

Configure using the installed versions' supported schemas and options:

- **Biome** (`biome.json`): consistent formatting and linting reduce review noise and catch common mistakes. Preserve agreed style; exclude generated outputs. Keep autofixes separate from read-only checks; do not enable unsafe fixes by default.
- **Knip** (`knip.json`): detect unused files, exports, and dependencies. Configure framework entry points, aliases, and runtime-loaded dependencies. Verify findings before deletion; explain narrow exceptions rather than hiding whole directories.
- **Dependency Cruiser** (`.dependency-cruiser.cjs`): enforce agreed import boundaries and prevent cycles. Decide feature/shared direction, cross-feature imports, type-only edges, and production-to-test imports. Verify framework files are actually analysed; ignored or unsupported files are coverage gaps, not passing architecture checks.

Adapt this `package.json` `scripts` example to the source directory and type checker. These commands are templates; validate them in the target repository:

```json
{
  "biome:check": "biome check .",
  "knip:check": "knip",
  "deps:check": "depcruise src --config .dependency-cruiser.cjs",
  "type-check": "tsc --noEmit",
  "check-all": "npm run biome:check && npm run knip:check && npm run deps:check && npm run type-check"
}
```

Use framework-aware checks where needed, such as `astro check` for Astro. Ensure monorepo commands cover every agreed package.

## 3. Establish the test setup

**Vendure:** follow the official [testing guide](https://docs.vendure.io/current/framework/developer-guide/testing). Set up E2E suites per feature using compatible `@vendure/testing`, `createTestEnvironment`, test configuration, and isolated database fixtures. Keep relevant Vendure services real; exercise behaviour through Shop/Admin APIs. Replace external payment, email, and shipping integrations with test doubles. Configure test discovery, server teardown, and database/state isolation so suites can run independently. An isolated lightweight database does not prove production-database-specific behaviour.

**Storefronts:** use Playwright against the actual storefront and a local HTTP mock API server, never a real Vendure testing server. Point both SSR and browser API requests at the mock; browser interception alone misses SSR. Use supported endpoint configuration; report a blocker if unavailable. Start and stop both processes through the test runner, waiting for readiness. Define explicit responses, reset state between tests, and fail on unexpected API operations. Isolate parallel workers or serialize shared mock state. Keep fixtures aligned with API contracts, with no fallback to live services. Include agreed success, empty, and consequential error states. These tests do not prove real storefront–Vendure compatibility.

Provide single-feature and full-suite commands. Retain Playwright traces and screenshots on failure.

## 4. Document and enforce

Update the applicable `AGENTS.md` with a short test-setup description: runner, real versus mocked services, test/fixture locations, and exact single-feature/full-suite commands with working directories. Include required completion checks and instructions to load the applicable MCP best practices. Describe only the setup present; avoid a second testing guide.

Require CI to install from lockfiles and run quality checks and agreed tests. Keep checks read-only and local hooks optional.

## 5. Verify and hand over

From each owning package root, run `npm run check-all`, the documented tests, and relevant builds, using that package's manager. In temporary controlled changes, confirm lint/type errors, unused code, and forbidden imports cause nonzero exits. Confirm representative test assertion failures and unexpected mock operations fail the test command. Remove probes and rerun successfully.

Report commands actually tested, pre-existing failures, coverage gaps, and approved deferred cleanup. Never disable rules broadly or claim hardening is complete while required checks remain failing or unverified.
