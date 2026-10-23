import express from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { readdir, readFile } from "node:fs/promises";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer, type Config, type Article } from "./mcp.js";
export type { Config } from "./mcp.js";

const root = new URL("../../", import.meta.url);
/** Read only approved Markdown directories relative to the checkout, not the shell's cwd. */
async function articles(): Promise<Article[]> {
  const entries: Article[] = [];
  for (const folder of ["workflow", "knowledge"]) {
    for (const file of (await readdir(new URL(folder, root))).sort()) {
      if (!file.endsWith(".md")) continue;
      entries.push({
        id: `${folder}/${file.slice(0, -3)}`,
        text: await readFile(new URL(`${folder}/${file}`, root), "utf8"),
      });
    }
  }
  return entries;
}

/**
 * Create the standalone Node HTTP adapter without starting a listener.
 * Host validation prevents DNS rebinding; public skills and protected Trello tools share /mcp.
 */
export function createApp(config: Config) {
  const app = createMcpExpressApp({
    allowedHosts: config.allowedHosts ?? ["localhost", "127.0.0.1", "[::1]"],
  });
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    if (req.headers.origin) {
      res.status(403).json({ error: "Browser origins are not supported" });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "256kb" }));
  app.post("/mcp", async (req, res) => {
    const server = createMcpServer(config, req.headers.authorization, articles);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    // Node may stream responses: retain transport ownership until the response closes.
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent)
        res.status(500).json({ error: "MCP request failed" });
    }
  });
  app.all("/mcp", (_req, res) => res.status(405).end());
  // Do not let Express expose parser errors or development stack traces to clients.
  const handleError: express.ErrorRequestHandler = (
    error,
    _req,
    res,
    _next,
  ) => {
    if (res.headersSent) {
      res.end();
      return;
    }
    const status =
      error?.status === 413 ? 413 : error?.status === 400 ? 400 : 500;
    res.status(status).json({
      error:
        status === 413
          ? "Request too large"
          : status === 400
            ? "Invalid request body"
            : "Internal server error",
    });
  };
  app.use(handleError);
  return app;
}
