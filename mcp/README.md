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
MARTIJN_MCP_TOKEN=<your-own-random-token-at-least-32-characters>
TRELLO_API_KEY=<trello-api-key>
TRELLO_API_TOKEN=<trello-api-token>
TRELLO_BOARD_ID=<test-board-id>
```

Generate a personal MCP token with `openssl rand -hex 32`. This is separate from your Trello credentials; do not share or commit either.

```sh
npm run dev:worker
```

Connect your MCP client using **Streamable HTTP**:

- URL: `http://localhost:8787/mcp`
- Header: `Authorization: Bearer <your-MCP_TOKEN>`

All requests require the MCP token. Trello credentials are only needed for Trello tools; skill tools work without them. Local Trello calls affect the real board—use a test board.

To explore tools visually, run `npx @modelcontextprotocol/inspector` and connect using its default proxy mode.

For deployment instructions, see [docs/mcp.md](../docs/mcp.md).
