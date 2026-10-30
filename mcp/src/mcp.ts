import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { includedDocuments } from "./included-documents.js";
import { registerTrello } from "./trello/trello-tools.js";
import type { User } from "./config.js";

/** Runtime dependencies for the MCP server. Never log this object. */
export type Config = {
  /** Override only in tests to target the fake Trello HTTP server. */
  apiBase?: string;
  board: string;
  key: string;
  token: string;
  users: readonly User[];
  /** Legacy configuration field retained for test and caller compatibility. */
  env: Record<string, string | undefined>;
};
/** Approved Markdown document, identified by a directory/filename ID without its extension. */
export type Article = { id: string; text: string };

/** Encode a value as a portable MCP text response. */
const result = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: typeof value === "string" ? value : JSON.stringify(value),
    },
  ],
});

/**
 * Create a request-scoped server with article and permission-checked Trello tools.
 * The caller owns transport connection/cleanup. Never share this instance between users.
 * @param config Trello configuration, identities, and secret bindings.
 * @param authorization Incoming Authorization header, not a username supplied by a tool.
 * @param articles Article provider: build-time bundle on Workers.
 */
export async function createMcpServer(
  config: Config,
  authorization: string | undefined,
  articles: () => Promise<Article[]>,
) {
  const server = new McpServer({
    name: "pinelab-engineering",
    version: "0.1.0",
  });
  const catalogue = await articles();
  const render = (article: Article) => result(
    `MCP usage: use authenticated Trello tools, not shell/curl. Load related guidance through its direct tool; use list_recipes/get_recipe for feature-specific resources.\n\n${includedDocuments(article, catalogue).map((document) => `Document: docs/${document.id}.md\n\n${document.text}`).join("\n\n---\n\n")}`,
  );
  for (const article of catalogue.filter(({ id }) => /^(best-practices|workflow)\//.test(id))) {
    const name = `get_${article.id.split("/").at(-1)!.replace(/-/g, "_")}`;
    server.registerTool(name, {
      description: article.text.match(/^description: (.+)$/m)?.[1]?.replace(/^"|"$/g, "") ?? article.id,
      inputSchema: {},
    }, async () => render(article));
  }
  server.registerTool(
    "list_recipes",
    {
      description:
        "Lists Pinelab Vendure and storefront recipes. Use get_recipe to read a recipe.",
      inputSchema: {},
    },
    async () =>
      result(
        catalogue.filter(({ id }) => id.startsWith("recipes/")).map(({ id, text }) => ({
          id,
          name: text.match(/^name: (.+)$/m)?.[1] ?? id.split("/").at(-1),
          description:
            text.match(/^description: (.+)$/m)?.[1]?.replace(/^"|"$/g, "") ??
            "",
        })),
      ),
  );
  server.registerTool(
    "get_recipe",
    {
      description:
        "Read a feature-specific Vendure or storefront resource by its recipe ID from list_recipes. Load only when relevant to the current feature or task.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      // Match against the approved catalogue; never turn client input into a filesystem path.
      const article = catalogue.find((a) => a.id === id && a.id.startsWith("recipes/"));
      return article
        ? render(article)
        : { ...result("Unknown recipe"), isError: true };
    },
  );
  registerTrello(server, config, authorization);
  return server;
}
