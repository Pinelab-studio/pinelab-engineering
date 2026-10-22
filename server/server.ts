import express from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { readdir, readFile } from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import type { User } from "./users.js";
import { registerTrello } from "./trello.js";

export type Config = {
  apiBase?: string;
  board: string;
  key: string;
  token: string;
  users: readonly User[];
  env: Record<string, string | undefined>;
  allowedHosts?: string[];
};
const root = new URL("../", import.meta.url);
const result = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: typeof value === "string" ? value : JSON.stringify(value),
    },
  ],
});
async function articles() {
  const entries = [];
  for (const folder of ["workflow", "knowledge"]) {
    for (const file of (await readdir(new URL(folder, root))).sort()) {
      if (!file.endsWith(".md")) continue;
      const text = await readFile(new URL(`${folder}/${file}`, root), "utf8");
      entries.push({
        id: `${folder}/${file.slice(0, -3)}`,
        name: text.match(/^name: (.+)$/m)?.[1] ?? file.slice(0, -3),
        description:
          text.match(/^description: (.+)$/m)?.[1]?.replace(/^"|"$/g, "") ?? "",
        text,
      });
    }
  }
  return entries;
}

export function createApp(config: Config) {
  const app = createMcpExpressApp({
    allowedHosts: config.allowedHosts ?? ["localhost", "127.0.0.1", "[::1]"],
  });
  app.disable("x-powered-by");
  // This MVP is for native MCP clients, not browser access. Prevent cross-origin requests.
  app.use((req, res, next) => {
    if (req.headers.origin) {
      res.status(403).json({ error: "Browser origins are not supported" });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "256kb" }));
  app.post("/mcp", async (req, res) => {
    const server = new McpServer({
      name: "pinelab-engineering",
      version: "0.1.0",
    });
    server.registerTool(
      "list_skills",
      {
        description:
          "List workflow and knowledge skills; load relevant skills before working.",
        inputSchema: {},
      },
      async () => result((await articles()).map(({ text, ...meta }) => meta)),
    );
    server.registerTool(
      "get_skill",
      {
        description:
          "Read a skill. Resolve references to other articles with list_skills/get_skill, not shell commands.",
        inputSchema: { id: z.string() },
      },
      async ({ id }) => {
        const article = (await articles()).find((a) => a.id === id);
        return article
          ? result(
              `MCP usage: use the authenticated Trello tools instead of the shell/curl examples below. Credentials are managed by the server. Load related articles with list_skills/get_skill.\n\n${article.text}`,
            )
          : { ...result("Unknown skill"), isError: true };
      },
    );
    registerTrello(server, config, req.headers.authorization);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
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
    res
      .status(status)
      .json({
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
