# Implementation plan: discoverable Trello card listing

Improve the existing `list_trello_cards` tool rather than adding another tool. Keep exact list-name selection consistent with card creation and updates, and expose enough context to avoid a separate board-discovery call for ordinary reads.

Status: implementation authorized by the user's final `A` confirmation and partially implemented. The richer response, exact-name input, documented names in discovery, list-scoped fetching, and existing test setup are approved. Todo and omitted-list slices completed RED → GREEN. The empty-list case passed on its first run, so implementation is paused under the agreed workflow to confirm keeping naturally passing cases as regression coverage. Remaining work: errors with available names, discovery description/schema, workflow guidance, and final verification.

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
3. Put all six list names documented in the Kanban skill directly in the tool description: `Inbox`, `Waiting For Client Approval`, `Todo`, `Doing`, `Ready For Review`, `✨Done`. Describe the argument as an exact list name. State that omitted `list` returns all open cards and that the response includes live lists. Consumers can choose a documented list without calling board discovery or loading the skill first.
4. Keep `list` a string, not an exhaustive enum. Documented names are stable conventions supplied by the user; still resolve and validate against the configured board at runtime. Do not fetch Trello during MCP registration/discovery. Extra board lists remain selectable by their exact names.
5. For missing or ambiguous list names, return the existing MCP error semantics plus current available list names in that same response. Do not silently choose another list or return unfiltered cards. Keep this enhancement local to listing unless a broader change is approved.
6. Update `docs/workflow/pinelab-trello-kanban.md`: call listing directly when the requested list is known; use returned live lists for later reads. Retain `get_trello_board` for labels, members, and full board context. Loading workflow guidance is not an extra prerequisite for a read whose tool schema provides sufficient instructions.
7. When `list` is supplied, resolve it against the configured board's open lists and request `/lists/{resolvedId}/cards?filter=open&fields=name,desc,idBoard,idList,idLabels,idMembers,due,url&members=true&member_fields=fullName,username`. Do not fetch all board cards and filter locally. Preserve existing card fields and member expansion. When `list` is omitted, continue using the board-cards endpoint with the same open-card filter and fields. Missing/ambiguous names fail before any card request; never fall back to board-wide fetching after a list-scoped failure.
8. Regenerate `mcp/TOOLS.md` through the build; do not edit generated catalogues manually.

Known-list reads require one MCP call and two Trello HTTP requests: one for open lists and one for only the selected list's open cards. Publishing names removes LLM discovery calls, not runtime name-to-ID resolution. No caching or ID input is included. Unknown or ambiguous names can still require a retry or user clarification; exposing options does not authorize guessing.

## Settled interface decisions

1. Return `{ lists, cards }`, intentionally replacing the bare card array.
2. Include all six documented Kanban list names in the tool description rather than examples only; runtime results/errors still provide authoritative board names.
3. Continue accepting exact names only; no list-ID input.
4. Fetch cards from the selected list's Trello endpoint, not the entire board, when a list name is supplied.

## Approval and scope boundary

Final implementation confirmation was received. Reuse the existing runner, fixtures, MCP integration setup, and Workers regression suite. Do not add dependencies, testing infrastructure, or a new listing-specific Workers test.

## Confirmed test seams

- MCP SDK `Client.callTool` and `Client.listTools` against the real server over `InMemoryTransport`, using the existing external fake Trello HTTP server. Observe tool responses and outgoing requests at that external HTTP boundary. Catches public tool contracts, list-scoped requests (including no board-wide fetch for a named list), discoverability, and authorization. Misses deployed HTTP/Workers transport and actual Trello behavior.
- Reuse the existing workerd end-to-end suite as regression coverage, without adding new cases or infrastructure.

## Confirmed test order

All new cases are integration tests at the MCP SDK seam above. Use controlled HTTP fixtures with two cards (`todo-card` in Todo, `doing-card` in Doing) and three open lists (Todo, Doing, Empty), with literal expected results.

1. Golden path: call `list_trello_cards({ list: "Todo" })`; expect `{ lists: [Todo, Doing, Empty], cards: [todo-card] }`, with each list represented by its literal `{ id, name }` and each card by its fixture fields. Observe exactly two external Trello requests: configured-board open lists and `/lists/todo/cards` with `filter=open` and the existing fields/member expansion. No board-wide cards request and no preliminary board tool call. Extend only the existing HTTP fixture to serve list-specific cards and record relevant query parameters.
2. Call with no list; expect both cards and all three open lists. Observe the board-cards endpoint with the open filter, not a list-cards endpoint.
3. Call with `list: "Empty"`; expect `cards: []` and all three open lists, using the empty list's cards endpoint.
4. Call with `list: "Unknown"`; expect `isError: true` and an error containing Todo, Doing, and Empty as available names. No card request.
5. Supply two fixture lists named Todo and call with `list: "Todo"`; expect an ambiguity error with available names, never a guessed selection. No card request.
6. Call `Client.listTools`; expect the tool description to contain all six exact documented names (Inbox, Waiting For Client Approval, Todo, Doing, Ready For Review, ✨Done). Expect the listing schema/description to explain exact-name input, omitted-list behavior, and live lists in the response. Expect discovery to make no Trello requests.
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

Known-list reads return correctly scoped cards and the current open lists in one MCP call, using only the selected list's card endpoint rather than fetching all board cards. Discovery includes all six documented list names and explains the contract without Trello access. Missing/ambiguous selections expose available names without guessing. Workflow guidance no longer mandates board discovery for ordinary listing. Approved integration cases and existing regressions pass, and generated documentation is current. No new infrastructure or deployment.

## Execution log

- Golden path: observed RED because the tool returned a bare card array. Implemented `{ lists, cards }` for selected lists and changed the external request to `/lists/{id}/cards`. The new test and all 24 existing permission tests passed (25 total). The test verifies exactly two Trello requests, open filtering, existing card fields/member expansion, and no board-wide card request.
- Omitted list: observed RED because that path still returned a bare array without lists. Implemented the same envelope with current open lists; all 26 permission tests passed.
- Empty list: added the agreed test at the existing seam. It passed on the first run with no further implementation, confirming that the preceding slices already cover this behavior. Paused before the next slice; never changed working code to force RED.
- Pending decision: retain immediately passing cases as regression tests, report them honestly as existing coverage, and continue remaining slices without repeated pauses for that same circumstance. New missing behavior still requires observed RED → minimal GREEN.
- Validation at this pause: `npm test` passed all 55 tests (including existing Workers regressions); `npm run check`, `npm run build`, and `git diff --check` passed. Expected failure-path diagnostics were emitted by existing tests.
- This is not a completed feature; discovery text, enriched selection errors, workflow guidance, and their tests remain outstanding.
