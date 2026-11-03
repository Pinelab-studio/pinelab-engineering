# Pinelab MCP

Requires Node.js 22+.

## Local setup

```sh
cd mcp
npm install
npm run generate:skills
```

Create `.dev.vars` (Git-ignored):

```dotenv
API_KEYS=martijn:<random-key-at-least-32-characters>,ayoub:<another-random-key-at-least-32-characters>
TRELLO_API_KEY=<trello-api-key>
TRELLO_API_TOKEN=<trello-api-token>
TRELLO_BOARD_ID=<test-board-id>
```

Generate each MCP key with `openssl rand -hex 32`. API_KEYS is a comma-separated list of `username:key` entries; all configured users have read/write access. Keep the value private and do not commit it.

```sh
npm run dev:worker
```

Connect your MCP client using **Streamable HTTP**:

- URL: `http://localhost:8787/mcp`
- Header: `Authorization: Bearer <your-MCP_TOKEN>`

All requests require the MCP token. Trello credentials are only needed for Trello tools; skill tools work without them. Local Trello calls affect the real board—use a test board.

To explore tools visually, run `npx @modelcontextprotocol/inspector` and connect using its default proxy mode.

## Pinelab Trello operations

Only use `pinelab_trello` for explicitly requested Pinelab Trello work. Call it with `{}` first: the response contains `guidance` and `actions`, with each action's description, permission, and JSON input schema. Discovery makes no Trello requests and needs no Trello credentials; HTTP authentication is still required.

Then call the same tool with an action and input, for example:

```json
{ "action": "list_cards", "input": { "list": "Todo" } }
```

Supported actions are `list_cards`, `get_card`, `get_board`, `create_card`, `update_card`, and `add_comment`. Inputs are strictly validated. Operation permissions are checked per action. The combined tool is conservatively annotated as potentially modifying data, so clients may request approval even for read actions.

The small entry-point definition remains visible in tool discovery. Detailed guidance and operation schemas load on demand; this does not enforce conditional visibility or agent compliance.

## Loading best practices

Add this instruction to your agent/project setup: **Before implementing or reviewing any code, call `get_coding_best_practices`. For Vendure work, also call `get_vendure_best_practices`.** No Pinelab mention is required for best practices. The MCP server cannot force an agent to call a tool.

Articles can declare multiple full repository-relative Markdown paths in a frontmatter block list (plain, unquoted paths):

```yaml
includedDocuments:
  - docs/best-practices/coding-best-practices.md
  - docs/best-practices/vendure-best-practices.md
```

Each document under `docs/best-practices/` and `docs/workflow/` gets a direct, no-argument tool, except the Kanban workflow, which is loaded through `pinelab_trello`. Tool names are `get_` plus the document filename without its extension, with hyphens replaced by underscores, for example `get_review` or `get_coding_best_practices`. Category directories are not included. Descriptions come from article frontmatter; workflows retain their explicit Pinelab trigger. These replace `list_skills` and `get_skill`.

Recipes have no individual tools. `list_recipes` lists feature-specific Vendure or storefront resources, including their IDs and descriptions; `get_recipe({ id: "recipes/storefront-seo" })` reads one on demand.

Document tools return the requested document and transitive inclusions in one response with labelled sections, each document once. Only documents in the approved workflow/best-practices/recipes catalogue can be included. Generation rejects missing references and cycles. Planning and review include their declared documents. Document IDs are unchanged; clients must refresh tool discovery after deployment.

For deployment instructions, see [docs/mcp.md](../docs/mcp.md).
