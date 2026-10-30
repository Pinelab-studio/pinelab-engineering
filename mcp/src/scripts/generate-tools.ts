import { readFile, writeFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer, type Article } from "../mcp.js";

const articles: Article[] = JSON.parse(
  await readFile(new URL("../generated/skills.json", import.meta.url), "utf8"),
);
// Registration needs no credentials; no tool handlers are executed.
const server = await createMcpServer(
  { board: "", key: "", token: "", users: [], env: {} },
  undefined,
  async () => articles,
);
const client = new Client({ name: "tool-documentation", version: "1.0.0" });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
try {
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const tools: Tool[] = [];
  let cursor: string | undefined;
  do {
    const page = await client.listTools({ cursor });
    tools.push(...page.tools);
    cursor = page.nextCursor;
  } while (cursor);
  tools.sort((a, b) => a.name.localeCompare(b.name, "en"));
  // Heuristic only: model tokenizers and client tool formatting vary.
  const definitionCharacters = JSON.stringify(tools).length;
  const estimatedTokens = Math.ceil(definitionCharacters / 4);
  const categoryTools = (category: string) => new Set(
    articles.filter(({ id }) => id.startsWith(`${category}/`))
      .map(({ id }) => `get_${id.split("/").at(-1)!.replace(/-/g, "_")}`),
  );
  const bestPractices = categoryTools("best-practices");
  const workflows = categoryTools("workflow");
  const markdown = [
    "# Exposed MCP tools",
    "",
    "Generated from the server's MCP `tools/list` response. Do not edit manually.",
    "Regenerate with `cd mcp && npm run build`.",
    "",
    `Total: **${tools.length} tools**. Names are server-local; clients may add a server prefix.`,
    "",
    `Adds ~${estimatedTokens.toLocaleString("en-US")} tokens to context.`,
    "",
    ...[
      { title: "Best practices", names: bestPractices },
      { title: "Workflows", names: workflows },
      { title: "Other tools", names: undefined },
    ].flatMap(({ title, names }) => [
      `## ${title}`,
      "",
      "| Tool | Description |",
      "| --- | --- |",
      ...tools.filter(({ name }) => names
        ? names.has(name)
        : !bestPractices.has(name) && !workflows.has(name),
      ).map((tool) => {
        const description = (tool.description ?? "_No description provided._")
          .replace(/\|/g, "&#124;")
          .replace(/\r\n|\r|\n/g, "<br>");
        return `| \`${tool.name}\` | ${description} |`;
      }),
      "",
    ]),
    "",
  ].join("\n");
  await writeFile(new URL("../../TOOLS.md", import.meta.url), markdown);
} finally {
  await client.close();
  await server.close();
}
