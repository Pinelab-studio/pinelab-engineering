import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer, type Article } from "./mcp.js";

test("every best practice and workflow has a direct readable tool, but recipes do not", async () =>
  scenario(async (client, articles) => {
    const { tools } = await client.listTools();
    assert.ok(!tools.some(({ name }) => ["list_skills", "get_skill"].includes(name)));
    // Verify every published document against the public tool interface.
    for (const article of articles) {
      const name = `get_${article.id.split("/").at(-1)!.replace(/-/g, "_")}`;
      if (article.id.startsWith("recipes/")) {
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

test("security scan is discoverable with a short explicit Pinelab trigger and readable instructions", async () =>
  scenario(async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find(({ name }) => name === "get_security_scan");
    assert.ok(tool, "Missing security scan tool");
    assert.equal(tool.description, "Scan, fix, and open a PR. Only use when the user explicitly mentions pinelab (case-insensitive).");
    const response = await client.callTool({ name: "get_security_scan", arguments: {} });
    assert.notEqual(response.isError, true);
    assert.ok(text(response).includes("Document: docs/workflow/security-scan.md"));
    assert.ok(text(response).includes("Review changes from the last 7 days by default"));
  }));

test("security scan bundles coding and PR guidance exactly once", async () =>
  scenario(async (client) => {
    const response = text(await client.callTool({ name: "get_security_scan", arguments: {} }));
    assert.equal(response.split("Document: docs/best-practices/coding-best-practices.md").length - 1, 1);
    assert.equal(response.split("Document: docs/best-practices/pull-request-guidelines.md").length - 1, 1);
    assert.ok(response.includes("## Think Before Coding"));
    assert.ok(response.includes("Keep the entire description at 200 words or fewer."));
  }));

test("review and planning include global rules once while Vendure remains standalone", async () =>
  scenario(async (client) => {
    for (const name of ["get_review", "get_plan_and_implement"]) {
      const response = text(await client.callTool({ name, arguments: {} }));
      assert.equal(response.split("Document: docs/best-practices/coding-best-practices.md").length - 1, 1);
    }
    const vendure = text(await client.callTool({ name: "get_vendure_best_practices", arguments: {} }));
    assert.equal(vendure.split("Document: ").length - 1, 1);
    assert.ok(!vendure.includes("Document: docs/best-practices/coding-best-practices.md"));
  }));

test("recipes are discoverable and readable only through the recipe tools", async () =>
  scenario(async (client) => {
    const { tools } = await client.listTools();
    assert.match(tools.find(({ name }) => name === "list_recipes")!.description!, /Lists Pinelab Vendure and storefront recipes\. Use get_recipe to read a recipe\./);
    const response = await client.callTool({ name: "list_recipes", arguments: {} });
    const recipes = JSON.parse(text(response)) as { id: string; description: string }[];
    assert.ok(recipes.some(({ id }) => id === "recipes/storefront-seo"));
    // Read every advertised recipe and reject paths outside the recipe catalogue.
    for (const recipe of recipes) {
      assert.ok(recipe.id.startsWith("recipes/"));
      assert.ok(recipe.description);
      assert.notEqual((await client.callTool({ name: "get_recipe", arguments: { id: recipe.id } })).isError, true);
    }
    for (const id of ["../README", "workflow/review", "best-practices/vendure-best-practices"]) {
      assert.equal((await client.callTool({ name: "get_recipe", arguments: { id } })).isError, true);
    }
  }));

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
