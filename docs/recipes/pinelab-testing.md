---
name: Testing Vendure backends and storefronts
description: Set up isolated storefront browser tests and Vendure unit and feature-module E2E tests, or extend existing coverage.
category: infrastructure
---

Set up self-contained tests using Playwright with mocked APIs for storefronts, and unit tests plus the Vendure testing framework for backends. This framework-independent guide covers test structure, boundaries, fixtures, and verification.

## 1. Inspect and choose coverage

Load `get_coding_best_practices` for scenario approval, independent expectations, and shared testing rules. For Vendure work, also load `get_vendure_best_practices`. Inspect package scripts, runtime versions, runners, and CI from each application's package root. Preserve compatible tooling; agree replacements and intended outcomes before setup.

Use deep-module testing: enter through a small public interface with internal collaborators kept real. Replace only external or nondeterministic boundaries, not every internal component or function. Do not expose private helpers solely for tests.

Colocate unit tests with source; keep E2E suites and fixtures in each application's `test/` directory. Update discovery and imports when moving tests.

### Separate frontend and backend scenario data

Separate storefront and Vendure E2E datasets: they test different behaviours. Storefront mock responses target rendering and interactions, including empty, error, and delayed-response states. Vendure fixtures seed a real test database to exercise business rules, permissions, and persistence; they are not mocked backend results.

Independent datasets cover each layer's cases without coupling frontend scenarios to backend setup. Share API types or schemas, not one scenario dataset; both must follow the API contract. Still share storefront fixtures between SSR and browser mocks.

This applies [Playwright's isolation and controlled-response guidance](https://playwright.dev/docs/best-practices) alongside [Vendure's API-to-database testing model](https://docs.vendure.io/current/framework/developer-guide/testing).

## 2. Set up storefront tests

1. Run Playwright against the real storefront, exercising rendering, hydration, components, state, and API clients together. Add focused unit tests for complex functions and branches not meaningfully covered by journeys, such as conversions, validation, and transformations. Avoid duplicate assertions across levels.
2. Run a loopback HTTP mock backend for SSR and build-time API/CMS requests. Use supported endpoint configuration; report a blocker if unavailable rather than adding a workaround. Never start a real commerce backend for storefront tests.
3. Intercept client-side API calls with Playwright before navigation; browser interception alone misses SSR. Return explicit operation responses. Share API-shaped product/content fixtures across both environments without copying production calculations or building a second backend.
4. Deny external browser traffic and prevent server-side fallback to live services. Stub or block third-party assets/scripts; block service workers that could bypass interception. Fail on unexpected API operations and uncaught browser errors. Assert recorded mock-server errors, not just HTTP responses.
5. Let Playwright manage both processes and readiness; do not reuse unknown servers. Reset state per case. Isolate workers or serialize shared mutable server state.
6. Cover agreed successful journeys, empty states, and consequential failures. Where relevant, verify failed mutations preserve data and stale responses cannot overwrite newer input. Control response ordering explicitly. Prefer accessible roles/labels and observable UI/network waits over component internals or sleeps. Run relevant desktop/mobile journeys and production build/preview checks against fixtures. Retain failure traces/screenshots.

## 3. Set up Vendure tests

1. Require **both unit tests and E2E tests**. Unit-test complex domain functions, strategies, calculations, and validation through public interfaces. Use E2E tests for module-level behaviour, permissions, persistence, and collaboration between real services; avoid repeating every assertion at both levels.
2. Follow Vendure's testing guide above. From its package root, configure compatible `@vendure/testing`, unit/E2E runners, test configuration, and fixture data. Use `createTestEnvironment` with its Shop/Admin API clients and test server; initialize the server from fixtures and destroy it during teardown.
3. Create **multiple feature-module E2E suites**, for example `test/configurator-pricing.e2e-spec.ts` and `test/customer-accounts.e2e-spec.ts`. Group related success, failure, and regression cases—not individual functions or the whole application. Reuse helpers without coupling suites or requiring execution order.
4. Keep relevant Vendure services, plugins, and database behaviour real. Replace external payment, email, shipping, and other integrations with doubles. Give independent suites isolated database fixture directories, ports, and sessions; reset mutable case state. Configure safe parallelism or serialization.
5. Prefer Shop/Admin GraphQL queries and mutations; direct public service calls are allowed when clearer or more isolated. Use `gql` from `graphql-tag`, never GraphQL template comments. Put documents below cases. Wait for observable conditions with bounded helpers, never arbitrary sleeps.

## 4. Verify and hand over

From each owning package root, document and run the actual unit, focused-feature E2E, full-suite, type-check, and build commands. For storefronts, document browser installation (`npx playwright install --with-deps chromium`) and headed runs (`playwright test --headed`); adapt to the package manager and installed version.

Confirm representative assertion failures and unexpected mock operations fail the command, then remove temporary probes and rerun successfully. Record commands tested, failures, and unverified checks.

Mocked storefront journeys do not prove real backend compatibility or calculations; verify backend behaviour separately. Lightweight test databases do not prove production-database-specific behaviour. Keep fixtures aligned with API contracts and record these limits.
