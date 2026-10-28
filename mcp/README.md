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

## Loading best practices

Add this instruction to your agent/project setup: **Before implementing or reviewing any code, call `get_best_practices_coding_best_practices`. For Vendure work, also call `get_best_practices_vendure_best_practices`.** No Pinelab mention is required for best practices. The MCP server cannot force an agent to call a tool.

Articles can declare multiple full repository-relative Markdown paths in a frontmatter block list (plain, unquoted paths):

```yaml
includedDocuments:
  - docs/best-practices/coding-best-practices.md
  - docs/best-practices/vendure-best-practices.md
```

Each document under `docs/best-practices/` and `docs/workflow/` gets a direct, no-argument tool. Tool names are `get_` plus the document ID with slashes and hyphens replaced by underscores, for example `get_workflow_review`. Descriptions come from article frontmatter; workflows retain their explicit Pinelab trigger. These replace `list_skills` and `get_skill`.

Recipes have no individual tools. `list_recipes` lists feature-specific Vendure or storefront resources, including their IDs and descriptions; `get_recipe({ id: "recipes/storefront-seo" })` reads one on demand.

Document tools return the requested document and transitive inclusions in one response with labelled sections, each document once. Only documents in the approved workflow/best-practices/recipes catalogue can be included. Generation rejects missing references and cycles. Planning and review include their declared documents. Document IDs are unchanged; clients must refresh tool discovery after deployment.

For deployment instructions, see [docs/mcp.md](../docs/mcp.md).
