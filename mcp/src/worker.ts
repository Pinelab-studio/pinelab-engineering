import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./mcp.js";
import { users } from "./users.js";
import articles from "./generated/skills.json" with { type: "json" };

/** Cloudflare string bindings, including Trello credentials and per-user bearer secrets. */
export type WorkerEnv = Record<string, string | undefined>;

export default {
  /**
   * Handle one stateless MCP request. Cloudflare provides HTTPS and hostname routing.
   * Native clients only: browser-origin requests and standalone SSE sessions are unsupported.
   */
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/mcp")
      return new Response("Not found", { status: 404 });
    if (request.headers.has("Origin"))
      return new Response("Browser origins are not supported", { status: 403 });
    if (request.method !== "POST")
      return new Response(null, { status: 405, headers: { Allow: "POST" } });

    // Validate bindings without printing values. Fail closed on missing/duplicate user secrets.
    const tokens = users.map((user) => env[user.tokenEnv]);
    if (
      !env.TRELLO_API_KEY?.trim() ||
      !env.TRELLO_API_TOKEN?.trim() ||
      !env.TRELLO_BOARD_ID?.trim() ||
      tokens.some((token) => !token || token.length < 32 || /\s/.test(token)) ||
      new Set(tokens).size !== tokens.length ||
      new Set(users.map((user) => user.username)).size !== users.length
    ) {
      return Response.json(
        { error: "Server configuration is incomplete or invalid" },
        { status: 503 },
      );
    }
    const server = createMcpServer(
      {
        board: env.TRELLO_BOARD_ID,
        key: env.TRELLO_API_KEY,
        token: env.TRELLO_API_TOKEN,
        users,
        env,
      },
      request.headers.get("Authorization") ?? undefined,
      async () => articles,
    );
    // JSON responses finish within this request, so no shared sessions or Durable Objects are needed.
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      maxRequestBodySize: 256 * 1024,
    });
    try {
      await server.connect(transport);
      return await transport.handleRequest(request);
    } catch {
      return Response.json({ error: "MCP request failed" }, { status: 500 });
    } finally {
      // Request-scoped cleanup also prevents one user's authenticated server being reused.
      await server.close();
    }
  },
};
