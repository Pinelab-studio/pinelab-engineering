import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer, type Article } from "./mcp.js";

// Exercise the public MCP interface using the real generated article catalogue.
// This verifies agent-facing guidance, not an LLM's compliance with it.
async function scenario(run: (client: Client) => Promise<void>) {
  const articles: Article[] = JSON.parse(await readFile(new URL("./generated/skills.json", import.meta.url), "utf8"));
  const server = createMcpServer({ board: "", key: "", token: "", users: [], env: {} }, undefined, async () => articles);
  const client = new Client({ name: "skills-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await run(client);
  } finally {
    await client.close();
    await server.close();
  }
}

test("the default plan-and-implement workflow is discoverable and readable under its new ID", async () =>
  scenario(async (client) => {
    const result = await client.callTool({ name: "list_skills", arguments: {} });
    assert.notEqual(result.isError, true);
    const skills = JSON.parse(text(result)) as { id: string; name: string }[];
    assert.equal(skills.find((skill) => skill.id === "workflow/plan-and-implement")?.name, "plan-and-implement");
    assert.ok(!skills.some((skill) => skill.id === "workflow/implement"));
    const article = await client.callTool({ name: "get_skill", arguments: { id: "workflow/plan-and-implement" } });
    assert.notEqual(article.isError, true);
    assert.match(text(article), /# Plan and implement/);
    assert.match(text(article), /## 3\. Plan in question rounds/);
  }));

test("workflow and Trello guidance include the word Pinelab", async () =>
  scenario(async (client) => {
    const result = await client.callTool({ name: "list_skills", arguments: {} });
    const skills = JSON.parse(text(result)) as { id: string; description: string }[];
    const workflows = skills.filter((skill) => skill.id.startsWith("workflow/"));
    assert.ok(workflows.length > 0);
    for (const workflow of workflows) {
      assert.match(workflow.description, /\bpinelab\b/i);
      const article = await client.callTool({ name: "get_skill", arguments: { id: workflow.id } });
      assert.notEqual(article.isError, true);
      assert.match(text(article), /\bpinelab\b/i);
    }
    const { tools } = await client.listTools();
    for (const tool of tools.filter((tool) => !["list_skills", "get_skill"].includes(tool.name))) {
      assert.match(tool.description!, /\bpinelab\b/i);
    }
  }));

function text(result: Awaited<ReturnType<Client["callTool"]>>) {
  return (result.content as { text: string }[])[0].text;
}

test("knowledge discovery and reading do not require a Pinelab mention", async () =>
  scenario(async (client) => {
    const { tools } = await client.listTools();
    for (const name of ["list_skills", "get_skill"]) {
      const description = tools.find((tool) => tool.name === name)!.description!;
      assert.doesNotMatch(description, /^Only use when/);
      assert.match(description, /Best practices do not require.*mention/);
      assert.match(description, /workflow\/.*explicitly mentions/i);
    }
    const result = await client.callTool({ name: "list_skills", arguments: {} });
    assert.notEqual(result.isError, true);
    const skills = JSON.parse(text(result)) as { id: string; description: string }[];
    const practices = skills.filter((skill) => skill.id.startsWith("best-practices/"));
    assert.ok(practices.length > 0);
    for (const practice of practices) {
      assert.doesNotMatch(practice.description, /only use when.*pinelab/i);
      const article = await client.callTool({ name: "get_skill", arguments: { id: practice.id } });
      assert.notEqual(article.isError, true);
      assert.match(text(article), /# /);
    }
  }));
