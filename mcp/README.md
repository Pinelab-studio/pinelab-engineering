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

For deployment instructions, see [docs/mcp.md](../docs/mcp.md).
