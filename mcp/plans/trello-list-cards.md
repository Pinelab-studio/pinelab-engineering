# Plan draft: discoverable Trello card listing

Improve the existing `list_trello_cards` tool rather than adding another tool. Keep exact list-name selection consistent with card creation and updates, and expose enough context to avoid a separate board-discovery call for ordinary reads.

Status: planning only; interface choices and test approval are pending. No implementation or test changes are authorized yet.

## Findings

- `mcp/src/trello/trello-tools.ts` already registers `list_trello_cards({ list?: string })`. It returns open cards, optionally filtered by an exact existing open-list name.
- `mcp/src/trello/trello-helpers.ts` resolves list names and refuses missing or duplicate names. Creation and updates use the same resolver.
- The listing response is currently a bare card array. Tool discovery does not describe its list parameter or show examples.
- `get_trello_board` exposes live lists, labels, and members, but the Kanban workflow currently directs agents to call it before ordinary card reads too.
- Tool discovery and the catalogue generator do not need Trello credentials or execute Trello handlers. Preserve that property.
- Existing tests cover permission gating and successful listing without asserting filtering or returned card data. The proposed golden path therefore needs a fixture with cards in multiple lists.
- No repository ADRs were found.

## Recommended approach (not yet approved)

1. Keep the existing tool name, optional `list` argument, read permission, JSON-in-text result formatting, and exact-name resolution. Do not add another list-discovery tool.
2. Return `{ lists: [{ id, name }], cards: [...] }`. Lists are all current open lists on the configured board, including empty lists; cards remain scoped to the requested list, or all open cards when omitted. Keep existing card fields. This intentionally changes the bare-array response contract and must be approved.
3. Describe the list argument with a compact example such as `Todo` or `Doing`. Examples are workflow conventions, not a guaranteed list catalogue. State that omitted `list` returns all open cards and that the response includes live lists.
4. Do not hard-code an exhaustive list enum or fetch Trello during MCP registration/discovery. Both can become stale or add unnecessary discovery-time dependencies.
5. For missing or ambiguous list names, return the existing MCP error semantics plus current available list names in that same response. Do not silently choose another list or return unfiltered cards. Keep this enhancement local to listing unless a broader change is approved.
6. Update `docs/workflow/pinelab-trello-kanban.md`: call listing directly when the requested list is known; use returned live lists for later reads. Retain `get_trello_board` for labels, members, and full board context. Loading workflow guidance is not an extra prerequisite for a read whose tool schema provides sufficient instructions.
7. Regenerate `mcp/TOOLS.md` through the build; do not edit generated catalogues manually.

Known-list reads then require one MCP call. The server can still make multiple Trello HTTP requests internally. Unknown or ambiguous names can still require a retry or user clarification; exposing options does not authorize guessing.

## Open decisions

1. Adopt the richer `{ lists, cards }` response (recommended), or preserve the bare-array contract and improve descriptions/errors only?
2. Put compact, non-exhaustive list-name examples in tool discovery (recommended), or expose live names only in runtime results/errors?

Test details that depend on these choices will be confirmed after the interface is settled. No tests will be written before seam/scenario approval and final implementation confirmation.

## Proposed test seams (not yet approved)

- MCP SDK `Client.callTool` and `Client.listTools` against the real server over `InMemoryTransport`, using an external fake Trello HTTP server. Catches public tool contracts, selection/filtering, discoverability, and authorization. Misses deployed HTTP/Workers transport and actual Trello behavior.
- Reuse the existing workerd end-to-end suite as regression coverage. A new listing-specific Workers case is optional, not assumed approved.

## Proposed test order (subject to approved interface)

1. Golden path: fixture contains Todo and Doing cards; `list_trello_cards({ list: "Todo" })` returns only Todo cards plus live lists if the richer response is approved.
2. Omitted list returns all open cards and, if approved, every live open list.
3. An existing empty list returns an empty card collection while remaining discoverable.
4. A missing list yields a tool error listing available names; duplicate names yield an ambiguity error, never guessed results.
5. `Client.listTools` documents exact-name selection and agreed discovery behavior without requiring live Trello access.
6. Existing permission tests continue to prove denied calls do not reach Trello.

Location: `mcp/src/permissions.test.ts`, following existing MCP/HTTP fixture conventions. Keep internal collaborators real and double only the external Trello boundary. Use literal expected results. Implement one approved test at a time: observed RED, minimal GREEN, then regression checks. If a proposed test already passes, report that and agree how to proceed rather than manufacture a failure.

## Verification and scope

- Focused tests: `cd mcp && npx tsx --test src/permissions.test.ts`.
- Final checks: `cd mcp && npm test && npm run check && npm run build`.
- Inspect generated tool documentation and manually trace the known-list one-call read from workflow guidance and tool schema.
- No live-board mutations, deployment, new tools, list-ID selection, fuzzy matching, archived cards/lists, pagination redesign, or unrelated refactoring.
- Baseline run before implementation: all 52 tests passed; TypeScript check passed. Expected failure-path diagnostics appeared during tests.
- Branch created from freshly pulled `main`: `feat/trello-list-cards-plan`.

After decisions and test approval, present the settled plan for final confirmation before implementing.
