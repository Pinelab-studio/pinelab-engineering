import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerTrello } from "./trello.js";
import type { User } from "./users.js";

export type Config = {
  apiBase?: string;
  board: string;
  key: string;
  token: string;
  users: readonly User[];
  env: Record<string, string | undefined>;
  allowedHosts?: string[];
};
export type Article = { id: string; text: string };
const result = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: typeof value === "string" ? value : JSON.stringify(value),
    },
  ],
});

export function createMcpServer(
  config: Config,
  authorization: string | undefined,
  articles: () => Promise<Article[]>,
) {
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
    async () =>
      result(
        (await articles()).map(({ id, text }) => ({
          id,
          name: text.match(/^name: (.+)$/m)?.[1] ?? id.split("/").at(-1),
          description:
            text.match(/^description: (.+)$/m)?.[1]?.replace(/^"|"$/g, "") ??
            "",
        })),
      ),
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
  registerTrello(server, config, authorization);
  return server;
}
