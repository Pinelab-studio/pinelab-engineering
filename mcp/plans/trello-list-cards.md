# Implementation plan: discoverable Trello card listing

Improve the existing `list_trello_cards` tool rather than adding another tool. Keep exact list-name selection consistent with card creation and updates, and expose enough context to avoid a separate board-discovery call for ordinary reads.

Status: awaiting final implementation confirmation. The user approved the richer response and discovery examples (1a, 2a), then approved the existing integration-test approach (1a) with no new infrastructure. Test seams and scenarios below are approved. No implementation or test changes are authorized until final confirmation.

## Findings

- `mcp/src/trello/trello-tools.ts` already registers `list_trello_cards({ list?: string })`. It returns open cards, optionally filtered by an exact existing open-list name.
- `mcp/src/trello/trello-helpers.ts` resolves list names and refuses missing or duplicate names. Creation and updates use the same resolver.
- The listing response is currently a bare card array. Tool discovery does not describe its list parameter or show examples.
- `get_trello_board` exposes live lists, labels, and members, but the Kanban workflow currently directs agents to call it before ordinary card reads too.
- Tool discovery and the catalogue generator do not need Trello credentials or execute Trello handlers. Preserve that property.
- Existing tests cover permission gating and successful listing without asserting filtering or returned card data. The proposed golden path therefore needs a fixture with cards in multiple lists.
- No repository ADRs were found.

## Technical approach

1. Keep the existing tool name, optional `list` argument, read permission, JSON-in-text result formatting, and exact-name resolution. Do not add another list-discovery tool.
2. Return `{ lists: [{ id, name }], cards: [...] }`. Lists are all current open lists on the configured board, including empty lists; cards remain scoped to the requested list, or all open cards when omitted. Keep existing card fields. The user explicitly approved this change from the bare-array response contract.
3. Describe the list argument with a compact example such as `Todo` or `Doing`. Examples are workflow conventions, not a guaranteed list catalogue. State that omitted `list` returns all open cards and that the response includes live lists.
4. Do not hard-code an exhaustive list enum or fetch Trello during MCP registration/discovery. Both can become stale or add unnecessary discovery-time dependencies.
5. For missing or ambiguous list names, return the existing MCP error semantics plus current available list names in that same response. Do not silently choose another list or return unfiltered cards. Keep this enhancement local to listing unless a broader change is approved.
6. Update `docs/workflow/pinelab-trello-kanban.md`: call listing directly when the requested list is known; use returned live lists for later reads. Retain `get_trello_board` for labels, members, and full board context. Loading workflow guidance is not an extra prerequisite for a read whose tool schema provides sufficient instructions.
7. Regenerate `mcp/TOOLS.md` through the build; do not edit generated catalogues manually.

Known-list reads then require one MCP call. The server can still make multiple Trello HTTP requests internally. Unknown or ambiguous names can still require a retry or user clarification; exposing options does not authorize guessing.

## Settled interface decisions

1. Return `{ lists, cards }`, intentionally replacing the bare card array.
2. Include compact, non-exhaustive examples such as `Todo` and `Doing` in discovery; runtime results/errors provide authoritative names.

## Approval and scope boundary

Only final implementation confirmation remains. Reuse the existing runner, fixtures, MCP integration setup, and Workers regression suite. Do not add dependencies, testing infrastructure, or a new listing-specific Workers test.

## Confirmed test seams

- MCP SDK `Client.callTool` and `Client.listTools` against the real server over `InMemoryTransport`, using an external fake Trello HTTP server. Catches public tool contracts, selection/filtering, discoverability, and authorization. Misses deployed HTTP/Workers transport and actual Trello behavior.
- Reuse the existing workerd end-to-end suite as regression coverage, without adding new cases or infrastructure.

## Confirmed test order

All new cases are integration tests at the MCP SDK seam above. Use controlled HTTP fixtures with two cards (`todo-card` in Todo, `doing-card` in Doing) and three open lists (Todo, Doing, Empty), with literal expected results.

1. Golden path: call `list_trello_cards({ list: "Todo" })`; expect `{ lists: [Todo, Doing, Empty], cards: [todo-card] }`, with each list represented by its literal `{ id, name }` and each card by its fixture fields. No preliminary board tool call.
2. Call with no list; expect both cards and all three open lists.
3. Call with `list: "Empty"`; expect `cards: []` and all three open lists.
4. Call with `list: "Unknown"`; expect `isError: true` and an error containing Todo, Doing, and Empty as available names, never unfiltered cards.
5. Supply two fixture lists named Todo and call with `list: "Todo"`; expect an ambiguity error with available names, never a guessed selection.
6. Call `Client.listTools`; expect the listing schema/description to explain exact list names, Todo/Doing examples, omitted-list behavior, and live lists in the response. Expect discovery to make no Trello requests.
7. Retain existing authorization regressions: denied calls fail before any Trello request. These already pass; do not manufacture RED for unchanged behavior.

Location: `mcp/src/permissions.test.ts`, following existing MCP/HTTP fixture conventions. Keep internal collaborators real and double only the external Trello boundary. Use literal expected results. Implement one approved test at a time: observed RED, minimal GREEN, then regression checks. If a proposed test already passes, report that and agree how to proceed rather than manufacture a failure.

## Verification and scope

- Focused tests: `cd mcp && npx tsx --test src/permissions.test.ts`.
- Final checks: `cd mcp && npm test && npm run check && npm run build`.
- Inspect generated tool documentation and manually trace the known-list one-call read from workflow guidance and tool schema.
- No live-board mutations, deployment, new tools, list-ID selection, fuzzy matching, archived cards/lists, pagination redesign, or unrelated refactoring.
- Baseline run before implementation: all 52 tests passed; TypeScript check passed. Expected failure-path diagnostics appeared during tests.
- Branch created from freshly pulled `main`: `feat/trello-list-cards-plan`.

## Definition of done

Known-list reads return correctly scoped cards and the current open lists in one MCP call. Discovery explains the contract without Trello access. Missing/ambiguous selections expose available names without guessing. Workflow guidance no longer mandates board discovery for ordinary listing. Approved integration cases and existing regressions pass, and generated documentation is current. No new infrastructure or deployment.

Confirm and implement? (y/n)
