import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./mcp.js";
import { loadConfig, type Environment } from "./config.js";
import { authenticate } from "./auth.js";
import articles from "./generated/skills.json" with { type: "json" };

/** Cloudflare string bindings, including Trello credentials and per-user bearer secrets. */
export type WorkerEnv = Environment;

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
    const config = loadConfig(env);
    if (!authenticate(config, request.headers.get("Authorization") ?? undefined))
      return Response.json({ error: "Forbidden: valid bearer token required" }, { status: 403 });
    if (request.method !== "POST")
      return new Response(null, { status: 405, headers: { Allow: "POST" } });

    const server = await createMcpServer(
      config,
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
