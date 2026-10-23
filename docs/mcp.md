# Engineering MCP server

Lightweight TypeScript/Node.js (22+) HTTP MCP server. Articles are public; **every Trello tool invocation** checks a per-user bearer token and permission before contacting Trello. No database, sessions, OAuth service, or GitHub runtime fetching.

## Cloudflare Workers (recommended deployment)

The Worker uses the SDK's native Web Request/Response transport, stateless JSON responses, and Cloudflare secret bindings. No Express adapter, filesystem, Durable Objects, database, or extra proxy is needed on Workers. `nodejs_compat` supplies the timing-safe token comparison. Articles are bundled from `workflow/` and `knowledge/` during every Wrangler build; redeploy after changing them.

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

Each `secret put` prompts privately for its value. Use a securely generated personal token of at least 32 non-whitespace characters. Never put credentials in `wrangler.jsonc` or its `vars` section. Add secret bindings for every user configured in `server/users.ts`. Until all required secrets are configured, the endpoint returns a generic HTTP 503 without exposing configuration details. Secrets can be rotated with the same commands; no source changes are needed.

Connect your MCP client to `https://pinelab-engineering-mcp.<your-subdomain>.workers.dev/mcp` with its personal bearer token. The exact hostname is printed by Wrangler. Edit `name` in `wrangler.jsonc` if needed. Cloudflare provides HTTPS and hostname routing; the Node-only HOST/PORT/MCP_ALLOWED_HOSTS settings do not apply. For a custom domain, configure a Worker Custom Domain in Cloudflare. Configure appropriate edge rate limiting for your account before broader exposure. Observability is disabled by default; if enabling logging, redact Authorization headers and credential-bearing Trello URLs.

For unattended deployment, supply `CLOUDFLARE_API_TOKEN` (least-privilege Workers deployment access) and `CLOUDFLARE_ACCOUNT_ID` in your CI secret store. Deployments are manual by default; this repository's CI only checks/tests/builds and does not publish.

### Local Worker development

Create a Git-ignored `.dev.vars` file in the repository root containing test-board credentials and personal token bindings:

```dotenv
TRELLO_API_KEY=<test-board-key>
TRELLO_API_TOKEN=<test-board-token>
TRELLO_BOARD_ID=<test-board-id>
MARTIJN_MCP_TOKEN=<at-least-32-random-characters>
```

Run `npm run dev:worker` and connect to the printed local `/mcp` URL. This is a local Workers runtime, but authorized Trello calls still use the **real Trello API**. Use a disposable test board. Do not commit `.dev.vars` or place real credentials in examples. `npm test` runs a separate local workerd test with dummy credentials and never performs authorized Trello operations there.

## Run on Node.js (alternative)

```sh
npm ci
# Export these with your secret manager or shell; never commit their values:
# TRELLO_API_KEY, TRELLO_API_TOKEN, TRELLO_BOARD_ID, MARTIJN_MCP_TOKEN
npm start
```

Default endpoint: `http://127.0.0.1:3000/mcp`. Optional variables: `PORT`, `HOST`, `MCP_ALLOWED_HOSTS` (comma-separated hostnames, without ports). A board short link or full board ID is supported.

Generate each bearer token with a secure generator, e.g. `openssl rand -hex 32`, and place it in the appropriate environment variable through your normal secret-management process. Startup requires configured user tokens of at least 32 non-whitespace characters and rejects duplicates. Missing Trello credentials also prevent startup. `.env` files are ignored by Git and are **not** automatically read.

## Users and permissions

Edit `server/users.ts`:

```ts
{ username: 'alice', tokenEnv: 'ALICE_MCP_TOKEN', permissions: ['read'] },
{ username: 'bob', tokenEnv: 'BOB_MCP_TOKEN', permissions: ['read', 'write'] },
```

Token values belong only in environment/secret bindings. Redeploy after changing users; use `wrangler secret put` to rotate Worker tokens. On Node, restart after changing users or credentials. Share each user's token privately with that user. Removing a user revokes access after redeploy/restart. Usernames are attribution strings, not Trello accounts.

Client transport configuration:

```json
{
  "url": "https://engineering.example.com/mcp",
  "headers": { "Authorization": "Bearer <your-personal-token>" }
}
```

The exact enclosing configuration differs by MCP client. Native clients must support Streamable HTTP and custom Authorization headers; automatic OAuth discovery is not supported. Article-only clients can omit the header. Invalid/missing authentication or insufficient permission produces an MCP tool error without any Trello requests, rather than an HTTP OAuth challenge. Tool discovery is public; the bearer check occurs on invocation, independently for every request.

## Tools

| Tool | Permission | Inputs |
| --- | --- | --- |
| `list_skills` | Public | None |
| `get_skill` | Public | `id`, e.g. `workflow/refine` |
| `get_board` | read | None; returns board, open lists, labels |
| `list_cards` | read | Optional exact `list` name; returns open cards and assignees |
| `get_card` | read | `card` ID/short link, optional activity `limit` (1–100) and `before` cursor |
| `create_card` | write | `title`, `description`, optional `list`, `labels` (names), `position` |
| `update_card` | write | `card`, optional `title` and/or `description` |
| `move_card` | write | `card`, exact `list` name, optional `position` |
| `add_label` / `remove_label` | write | `card`, exact `label` name |

Use only the segment following `/c/` from a Trello URL, not the entire URL. `position` accepts `top`, `bottom`, or a positive number. Write-only users can mutate cards: internal reads needed to check boards, lists, labels, and existing values do not require a separate read permission.

Only Markdown in `workflow/` and `knowledge/` is exposed, indexed by directory and filename. Recipes are excluded; arbitrary paths cannot be read. Articles ship with the checkout/deployment, with no runtime network fetch. `get_skill` adds MCP usage guidance so agents use authenticated tools instead of the original articles' curl examples. Load related articles through `list_skills`/`get_skill`.

## Kanban and attribution

- Creates default to **Todo/top**. Missing type (`blue_dark`) or client (`green`) labels produce warnings but do not prevent creation. Only explicitly selected existing labels are applied.
- Lists and labels are resolved against the configured board; missing/ambiguous names fail rather than guessing. Existing cards are checked against that board before reading activity or writing.
- Updates preserve untouched fields. Labels are added/removed individually. Moves preserve default positioning unless specified.
- Every actual mutation attempts one comment, e.g. `bob updated the title; updated the description.` or `bob moved this card to Doing.` No comment for reads or no-ops. Creation comments name the destination list. Label comments name the label.
- Comment failures are intentionally ignored after a successful change. Attribution is therefore **best effort**, not a compliance audit trail.
- The agent follows the Kanban/refinement articles for interviews, confirmed estimates, Markdown descriptions, client approvals, and lifecycle decisions. These conversational approvals cannot be independently verified by the server. Refined saves may use `update_card` then `move_card`; these are separate, non-transactional calls and comments.
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
