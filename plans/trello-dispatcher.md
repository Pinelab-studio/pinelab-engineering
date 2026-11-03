# On-demand Pinelab Trello MCP — draft plan

Status: planning; implementation and test changes are not authorized.

## Goal and boundaries

Replace six advertised Trello operation tools and the separate Kanban guidance loader with one compact `pinelab_trello` entry point. Load workflow guidance and detailed operation schemas only when requested. Keep other workflows and best-practice tools unchanged. This reduces advertised schema size, not conditional tool visibility; the client still sees the entry point.

## Repository findings

- `mcp/src/trello/trello-tools.ts` registers six operations.
- `mcp/src/trello/trello-helpers.ts` currently combines registration, permission checks, and API helpers. Permissions must move to per-action dispatch rather than one shared read/write requirement.
- `mcp/src/mcp.ts` automatically exposes every workflow as a tool; the Kanban article needs an explicit exception while remaining bundled and published.
- Existing integration tests use the SDK client and in-memory MCP transport with a fake external Trello HTTP service. Worker tests cover the deployed HTTP boundary through workerd.
- Existing tests assert separate tool names and one direct tool per workflow; these contracts need deliberate updates.
- Trello guidance currently names the old tools. Update its operation references without relaxing lifecycle or approval requirements.

## Proposed design (pending approval)

1. Advertise optional `action` plus an object `input`, without embedding all operation schemas. Omitted action returns the Kanban workflow and detailed action schemas, with no Trello requests.
2. Actions: `list_cards`, `get_card`, `get_board`, `create_card`, `update_card`, `add_comment`.
3. Reuse operation schemas for runtime strict validation and discovery output. Reject unknown actions, unknown fields, malformed inputs, and nonempty inputs without an action; return actionable errors without side effects.
4. Preserve operation defaults, response shapes, authenticated attribution, per-action read/write permission checks, board scoping, current Done restrictions, selection validation, sanitized failures, and no automatic write retries.
5. Remove legacy tools rather than retaining aliases. Document the breaking interface change and client tool-list refresh requirement.
6. Keep documentation discovery independent of Trello credentials, matching existing guidance loading; preserve transport authentication. Operation calls still require their existing credentials and permissions.
7. Use conservative mutation-capable annotations for the combined tool. A single tool cannot advertise separate read-only hints per action; client approval UX may become less granular.

## Proposed test seams (pending confirmation)

- Public MCP `listTools`/`callTool` via real SDK transport, with a fake external Trello HTTP service: catches discovery, validation, dispatch, permissions, and observable API effects; misses live Trello behavior and client UI/agent compliance.
- Existing worker HTTP tests via workerd: catches transport authentication, article bundling, and runtime integration; misses live hosting and live Trello behavior.

## Proposed ordered scenarios (pending confirmation)

1. Golden path: discover the single tool, call without action, then list Todo cards using the returned contract. Expect workflow and action schemas without upstream requests during discovery, then the expected lists/cards response.
2. Invalid action, missing required operation inputs, unknown fields, or inputs without an action: clear error and no Trello requests.
3. Invalid token and insufficient per-action permissions: denial before Trello requests; writer-only users retain write access without requiring read permission.
4. Migrate existing operation regression coverage to the new entry point, preserving defaults, partial-update semantics, board isolation, Done update rejection, attribution, and failure/no-retry behavior.
5. Catalogue regression: no legacy Trello tools or separate Kanban loader; unrelated guidance remains readable. Compare serialized advertised Trello schema size before and after, without claiming exact tokenizer savings.
6. Adapt worker smoke/regression tests for the dispatcher and verify guidance is available from the bundled catalogue.

Use the existing Node test runner through tsx, current controlled fixtures, real internal collaborators, and external HTTP doubles. Implement one new test at a time: observed RED, minimal GREEN, regression verification. Do not write tests before seams and scenarios are confirmed.

## Affected areas and verification

Affected: `mcp/src/mcp.ts`, `mcp/src/trello/`, `mcp/src/permissions.test.ts`, `mcp/src/skills.test.ts`, other tests referencing old tools, `mcp/test/e2e.test.ts`, `docs/workflow/pinelab-trello-kanban.md`, and relevant MCP documentation. Regenerate `mcp/TOOLS.md`; do not hand-edit it.

From `mcp/`: install locked dependencies with `npm ci` if needed; run `npm test`, `npm run check`, and `npm run build`. Supplement with a client discovery/help/list smoke check if an updated client is available; never perform live writes merely to verify this change.

## Decisions awaiting user input

1. Approve the compact action/input interface with combined help, or choose full up-front typed action schemas.
2. Approve immediate removal of old tool names, or require a compatibility transition with temporary context overhead.
3. Approve the proposed integration and worker seams/scenarios, or request changes. Test details dependent on the chosen interface will be finalized afterward.

After decisions are settled, present the final plan for explicit implementation approval. No implementation in this planning turn.

## Checks this turn

Working tree was clean. Updated local main from origin and created `feat/trello-dispatcher`. Installed locked dependencies in `mcp/`. Baseline: all 59 tests passed, `npm run check` passed, and `npm run build` passed. npm reported four dependency vulnerabilities (two moderate, two high); dependency remediation is outside this task. An initial npm invocation from the repository root failed because the package lives in `mcp/`; rerunning there succeeded.
