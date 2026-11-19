import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer, type Article } from "./mcp.js";

test("guidance is readable through direct tools except board guidance, references and recipes", async () =>
  scenario(async (client, articles) => {
    const { tools } = await client.listTools();
    assert.ok(!tools.some(({ name }) => ["list_skills", "get_skill", "get_auto_implementation"].includes(name)));
    assert.equal(tools.filter(({ name }) => name === "get_implement").length, 1);
    assert.match(tools.find(({ name }) => name === "pinelab_trello")!.description!, /Call without action to load workflows and action parameters/);
    // Verify every published document against the public tool interface.
    for (const article of articles) {
      const name = `get_${article.id.split("/").at(-1)!.replace(/-/g, "_")}`;
      if (["workflow/pinelab-trello-kanban", "workflow/kanban-priorities"].includes(article.id)) {
        assert.ok(!tools.some((tool) => tool.name === name));
        const response = await client.callTool({ name: "pinelab_trello", arguments: {} });
        assert.notEqual(response.isError, true);
        assert.ok(JSON.parse(text(response)).guidance.includes(article.text));
        continue;
      }
      if (article.id.startsWith("recipes/")) continue;
      if (article.id.startsWith("workflow/references/")) {
        assert.ok(!tools.some((tool) => tool.name === name));
        continue;
      }
      const tool = tools.find((tool) => tool.name === name);
      assert.ok(tool);
      if (article.id.startsWith("workflow/")) assert.match(tool.description!, /pinelab/i);
      const response = await client.callTool({ name, arguments: {} });
      assert.notEqual(response.isError, true);
      assert.ok(text(response).includes(article.text));
    }
  }));

test("review includes PR guidance while refinement and Vendure remain standalone", async () =>
  scenario(async (client) => {
    const review = text(await client.callTool({ name: "get_review", arguments: {} }));
    assert.deepEqual(review.match(/^Document: .+$/gm), [
      "Document: docs/workflow/review.md",
      "Document: docs/workflow/references/pull-request-guidelines.md",
    ]);
    const refinement = text(await client.callTool({ name: "get_refine", arguments: {} }));
    assert.deepEqual(refinement.match(/^Document: .+$/gm), ["Document: docs/workflow/refine.md"]);
    const vendure = text(await client.callTool({ name: "get_vendure_best_practices", arguments: {} }));
    assert.deepEqual(vendure.match(/^Document: .+$/gm), ["Document: docs/best-practices/vendure-best-practices.md"]);
  }));

test("both implementation entry points include the shared implementation guide and PR guidelines", async () =>
  scenario(async (client) => {
    for (const [name, entry] of [
      ["get_implement", "implement"],
      ["get_auto_implement", "auto-implement"],
    ]) {
      const response = await client.callTool({ name, arguments: {} });
      assert.notEqual(response.isError, true);
      assert.deepEqual(text(response).match(/^Document: .+$/gm), [
        `Document: docs/workflow/${entry}.md`,
        "Document: docs/workflow/references/implementation.md",
        "Document: docs/workflow/references/pull-request-guidelines.md",
      ]);
    }
  }));

test("references are included but never exposed as tools", async () =>
  scenario(async (client, articles) => {
    const fragments = articles.filter(({ id }) => id.startsWith("workflow/references/"));
    assert.ok(fragments.some(({ id }) => id === "workflow/references/implementation"));
    assert.ok(fragments.some(({ id }) => id === "workflow/references/pull-request-guidelines"));
    const { tools } = await client.listTools();
    for (const { id } of fragments) {
      const name = `get_${id.split("/").at(-1)!.replace(/-/g, "_")}`;
      assert.ok(!tools.some((tool) => tool.name === name), name);
    }
  }));

test("implementation entry points retain distinct selection and manual-verification policies", async () =>
  scenario(async (client) => {
    const linked = text(await client.callTool({ name: "get_implement", arguments: {} })).split("Document: docs/workflow/references/implementation.md")[0];
    const automatic = text(await client.callTool({ name: "get_auto_implement", arguments: {} })).split("Document: docs/workflow/references/implementation.md")[0];
    assert.match(linked, /Accept one card link/);
    assert.match(linked, /caller is responsible for supplying a refined card/);
    assert.match(linked, /regardless of its current list, labels, or approval state/);
    assert.match(linked, /## Manual verification: implementer/);
    assert.match(linked, /Complete required manual checks as well as automated verification/);
    assert.ok(!linked.includes("Written by Pinobi2"));
    assert.match(automatic, /first eligible card in board order/);
    assert.match(automatic, /existing \*\*pinobi2\*\* label and without the \*\*blocked\*\* label/);
    assert.match(automatic, /## Manual verification: reviewing human/);
    assert.match(automatic, /Pending manual checks alone are not an implementation blocker/);
    assert.match(automatic, /Manual verification required — reviewing human/);
    assert.ok(!automatic.includes("Written by Pinobi2"));
    assert.match(automatic, /Never settle an unresolved blocker/);
    assert.ok(!automatic.includes("## Manual verification: implementer"));
  }));

test("recipes are included in list_recipes", async () =>
  scenario(async (client) => {
    const files = await readdir(new URL("../../docs/recipes/", import.meta.url));
    const expected = files.filter((file) => file.endsWith(".md")).map((file) => `recipes/${file.slice(0, -3)}`).sort();
    const response = await client.callTool({ name: "list_recipes", arguments: {} });
    assert.notEqual(response.isError, true);
    const recipes = JSON.parse(text(response)) as { id: string }[];
    assert.deepEqual(recipes.map(({ id }) => id).sort(), expected);
  }));

test("list_plugins returns plugins from mocked Markdown", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response([
    "# Resources index",
    "## Recipes",
    "- [SEO guide](https://example.com/seo.md) — Audit storefront SEO.",
    "## Plugins",
    "- [Shipping plugin](https://example.com/shipping/README.md) — Configure shipping calculators.",
  ].join("\n")));

  await scenario(async (client) => {
    const response = await client.callTool({ name: "list_plugins", arguments: {} });
    assert.notEqual(response.isError, true);
    assert.deepEqual(JSON.parse(text(response)), [{
      name: "Shipping plugin",
      description: "Configure shipping calculators.",
      url: "https://example.com/shipping/README.md",
    }]);
  });
});

/** Exercise public MCP tools using the real generated catalogue, not agent compliance. */
async function scenario(run: (client: Client, articles: Article[]) => Promise<void>) {
  const articles: Article[] = JSON.parse(await readFile(new URL("./generated/skills.json", import.meta.url), "utf8"));
  const server = await createMcpServer({ board: "", key: "", token: "", users: [], env: {} }, undefined, async () => articles);
  const client = new Client({ name: "skills-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await run(client, articles);
  } finally {
    await client.close();
    await server.close();
  }
}

/** Extract the text from an MCP tool response. */
function text(result: Awaited<ReturnType<Client["callTool"]>>) {
  return (result.content as { text: string }[])[0].text;
}
