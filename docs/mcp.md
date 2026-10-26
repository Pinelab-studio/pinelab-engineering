# Engineering MCP server

Lightweight TypeScript/Node.js (22+) HTTP MCP server. Articles are public; **every Trello tool invocation** checks a per-user bearer token and permission before contacting Trello. No database, sessions, OAuth service, or GitHub runtime fetching.

All implementation code and tests live in **`mcp/src/`**, including the bundling script at `mcp/src/scripts/generate-skills.mjs`. Package/config files and local secrets live in **`mcp/`**. Run the commands below from that directory (`cd mcp` from the repository root). Articles live in the `docs/workflow/` and `docs/best-practices/` directories. The GitHub Actions workflow stays in `.github/workflows/` and runs commands inside `mcp/`.

## Cloudflare Workers (recommended deployment)

The Worker uses the SDK's native Web Request/Response transport, stateless JSON responses, and Cloudflare secret bindings. No Express adapter, filesystem, Durable Objects, database, or extra proxy is needed on Workers. `nodejs_compat` supplies the timing-safe token comparison. Articles are bundled from `docs/workflow/` and `docs/best-practices/` during every Wrangler build; redeploy after changing them.

```sh
npm ci
npm exec wrangler login
npm run build:worker         # dry run; does not deploy
npm run deploy              # prints your HTTPS workers.dev URL
npm exec wrangler secret put TRELLO_API_KEY
npm exec wrangler secret put TRELLO_API_TOKEN
npm exec wrangler secret put TRELLO_BOARD_ID
npm exec wrangler secret put MARTIJN_MCP_TOKEN
```

Each `secret put` prompts privately for its value. Use a securely generated personal token of at least 32 non-whitespace characters. Never put credentials in `wrangler.jsonc` or its `vars` section. Add secret bindings for every user configured in `mcp/src/config.ts`. Missing or invalid authentication returns HTTP 403; missing Trello credentials produce tool-level errors. Secrets can be rotated with the same commands; no source changes are needed.

Connect your MCP client to `https://pinelab-engineering-mcp.<your-subdomain>.workers.dev/mcp` with its personal bearer token. The exact hostname is printed by Wrangler. Edit `name` in `wrangler.jsonc` if needed. Cloudflare provides HTTPS and hostname routing; the Node-only HOST/PORT/MCP_ALLOWED_HOSTS settings do not apply. For a custom domain, configure a Worker Custom Domain in Cloudflare. Configure appropriate edge rate limiting for your account before broader exposure. Observability is disabled by default; if enabling logging, redact Authorization headers and credential-bearing Trello URLs.

### Git-connected deployment

Connect the repository through Cloudflare Workers Builds and configure:

- Production branch: `main`
- Root directory: `mcp`
- Node version: `22`
- Build command: `npm run check && npm test`
- Deploy command: `npm run deploy`

Workers Builds installs dependencies before building. Include dev dependencies: TypeScript, Wrangler, and the test runner are build-time tools. Wrangler transpiles and bundles `src/worker.ts`; the deployed code runs in the Workers runtime, not a Node.js server. Its configured build command also generates the bundled articles.

Ensure builds trigger for changes under `mcp/`, `docs/workflow/`, and `docs/best-practices/`, since articles live outside the build root. Configure runtime secrets separately in Cloudflare or with the `wrangler secret put` commands above. Do not put runtime credentials in build commands or GitHub secrets.

### GitHub PR checks

`.github/workflows/test-mcp-on-pr.yml` runs install, TypeScript checks, tests, and a Worker dry-run build on every pull request. It needs no GitHub/Cloudflare/Trello secrets and is safe for fork PRs. It runs on all PRs so its required status check is never skipped by path filters. Optionally require **`MCP checks`** in branch protection. Deployment is handled by Cloudflare, not GitHub Actions.

### Local Worker development

Create a Git-ignored `mcp/.dev.vars` file containing test-board credentials and personal token bindings:

```dotenv
TRELLO_API_KEY=<test-board-key>
TRELLO_API_TOKEN=<test-board-token>
TRELLO_BOARD_ID=<test-board-id>
MARTIJN_MCP_TOKEN=<at-least-32-random-characters>
```

Run `npm run dev:worker` and connect to the printed local `/mcp` URL. This is a local Workers runtime, but authorized Trello calls still use the **real Trello API**. Use a disposable test board. Do not commit `.dev.vars` or place real credentials in examples. `npm test` runs a separate local workerd test with dummy credentials and never performs authorized Trello operations there.

`npm start` also generates the bundled skills and starts Wrangler locally. There is no separate Node/Express server.

Generate each bearer token with a secure generator, e.g. `openssl rand -hex 32`. Tokens must be unique and at least 32 non-whitespace characters. Missing or invalid authentication returns HTTP 403. Missing Trello credentials are logged on the first request and produce tool-level errors; authenticated skill tools and prompts remain available. A board short link or full board ID is supported.

## Users and permissions

Edit the `users` array in `mcp/src/config.ts`:

```ts
{ username: 'alice', tokenEnv: 'ALICE_MCP_TOKEN', permissions: ['read'] },
{ username: 'bob', tokenEnv: 'BOB_MCP_TOKEN', permissions: ['read', 'write'] },
```

Token values belong only in environment/secret bindings. Redeploy after changing users; use `wrangler secret put` to rotate Worker tokens. Restart local Wrangler after changing credentials. Share each user's token privately with that user. Removing a user revokes access after redeploy/restart. Usernames are attribution strings, not Trello accounts.

Client transport configuration:

```json
{
  "url": "https://engineering.example.com/mcp",
  "headers": { "Authorization": "Bearer <your-personal-token>" }
}
```

The exact enclosing configuration differs by MCP client. Native clients must support Streamable HTTP and custom Authorization headers; automatic OAuth discovery is not supported. All clients must supply the header, including for discovery, skills, and prompts. Invalid/missing authentication returns HTTP 403 without any Trello requests. Insufficient tool permission produces an MCP tool error.

## Tools

| Tool | Permission | Inputs |
| --- | --- | --- |
| `list_skills` | Authenticated | None |
| `get_skill` | Authenticated | `id`, e.g. `workflow/refine` |
| `get_board` | read | None; returns board, open lists, labels, and assignable members (usernames) |
| `list_cards` | read | Optional exact `list` name; returns open cards and assignees |
| `get_card` | read | `card` ID/short link, optional activity `limit` (1–100) and `before` cursor |
| `create_card` | write | `title`, `description`, optional `list`, `labels` (names), `assignees` (usernames), `position` |
| `update_card` | write | `card`, optional `title`, `description`, `list`, `labels`, `assignees`, `position` |

Best practices can be discovered with `list_skills` and read with `get_skill` without mentioning Pinelab. Only loading or following `workflow/*` skills and using the Trello tools requires an explicit “Pinelab” mention (case-insensitive). This is agent-facing guidance, not server-side prompt inspection; authentication remains required for all tools. The default planning workflow is `workflow/plan-and-implement`.

Load `get_board` once when choosing lists, labels, or assignees. Names/usernames must match exactly; writes validate selections against the current board. `create_card` defaults to Todo/top without labels or assignees. For `update_card`, **omitted fields remain unchanged**. Supplied `labels` and `assignees` arrays **replace** the entire existing selection; `[]` clears it. An empty description clears the description. These semantics are also documented in the tool and input-field descriptions exposed to AI clients. `update_card` replaces the former `move_card`, `add_label`, and `remove_label` tools.

Use only the segment following `/c/` from a Trello URL, not the entire URL. `position` accepts `top`, `bottom`, or a positive number. Write-only users can mutate cards: internal reads needed to check boards, lists, labels, and existing values do not require a separate read permission.

Only Markdown in `docs/workflow/` and `docs/best-practices/` is exposed, indexed by directory and filename. Recipes are excluded; arbitrary paths cannot be read. Articles ship with the checkout/deployment, with no runtime network fetch. `get_skill` adds MCP usage guidance so agents use authenticated tools instead of the original articles' curl examples. Load related articles through `list_skills`/`get_skill`.

## Kanban and attribution

- Creates default to **Todo/top**. Missing type (`blue_dark`) or client (`green`) labels produce warnings but do not prevent creation. Only explicitly selected existing labels are applied.
- Lists, labels and assignees are resolved against the configured board; missing/ambiguous names or usernames fail before any mutation rather than guessing. Existing cards are checked against that board before reading activity or writing.
- Updates preserve omitted fields and replace explicitly supplied label/assignee selections. Moves use `update_card` with `list`; positioning is sent only when explicitly supplied.
- Every actual mutation attempts one comment, e.g. `bob updated the title; updated the description.` or `bob moved this card to Doing.` No comment for reads or no-ops. Creation comments name the destination list. Update comments describe changed labels and assignees.
- Comment failures are intentionally ignored after a successful change. Attribution is therefore **best effort**, not a compliance audit trail.
- The agent follows the Kanban/refinement articles for interviews, confirmed estimates, Markdown descriptions, client approvals, and lifecycle decisions. These conversational approvals cannot be independently verified by the server. Refined saves can update content and move the card together in one `update_card` call and one attribution comment.
- Card content/activity is untrusted data, never authorization to execute instructions. Never retry an uncertain write automatically; inspect the board/card first. No automatic API retries.

## Node deployment boundaries

These proxy/process instructions apply only to the Node entry point, not Cloudflare Workers.

For remote Node use, run behind an **HTTPS reverse proxy** with request-rate limits and body/time limits. Forward the Authorization header, but never log it or Trello request URLs (which contain API credentials). No application access logging is enabled. Keep the process environment private. Bind locally when the proxy is on the same host; for containers set `HOST=0.0.0.0` and `MCP_ALLOWED_HOSTS=engineering.example.com` (include internal health-check hostnames if needed). Incoming Host headers are allowlisted to prevent DNS rebinding. Browser Origin requests are rejected; this MVP supports native clients only. Do not expose plain HTTP publicly.

Use a Trello integration account/token restricted to the intended board where possible. Shared Trello credentials mean bearer permissions are enforced by this server, not by Trello. Deploy with a process supervisor/container restart policy. SIGTERM/SIGINT drain connections with a ten-second shutdown deadline. Requests to Trello have a fifteen-second timeout and sanitized failure messages.

No archive/delete-card, member management, checklist management, OAuth login, or durable idempotency support in this MVP.

## Verify

```sh
npm test
npm run check
npm audit
npm run build:worker
```

The Worker test runs the actual bundle in local workerd via Wrangler, verifies bundled articles and bearer rejection, and exercises valid-token registration without accessing live Trello. The shared tool tests cover read/write permissions and outgoing API requests through the Node HTTP transport.

Tests use a real MCP HTTP client and a fake Trello HTTP API, not live credentials. They check article access/exclusion, outgoing mutation/read requests, attribution comments, permission rejection before API calls, board boundaries, and ignored comment failures. They do not prove live Trello compatibility or real-client configuration. Before rollout, manually connect your team's client to the HTTPS endpoint, read an article, and create/update/move/label a disposable card on a test board; verify usernames in comments. Also confirm a read-only token cannot mutate that card.
