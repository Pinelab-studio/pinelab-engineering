import { test } from "node:test";
import { request } from "node:http";
import assert from "node:assert/strict";
import express from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "./server.js";

const records: { method: string; path: string; body: any }[] = [];
const fake = express();
fake.use(express.json());
fake.use((req, res) => {
  records.push({ method: req.method, path: req.path, body: req.body });
  if (req.path.endsWith("/comments"))
    return res.status(500).json({ error: "unavailable" });
  if (req.path === "/boards/board") return res.json({ id: "board" });
  if (req.path.endsWith("/lists"))
    return res.json([
      { id: "todo", name: "Todo" },
      { id: "doing", name: "Doing" },
    ]);
  if (req.path.endsWith("/labels"))
    return res.json([{ id: "bug", name: "Bug", color: "blue_dark" }]);
  return res.json({
    id: "card",
    idBoard: req.path.includes("foreign") ? "other" : "board",
    name: "Original",
    desc: "Original description",
    idList: "todo",
    idLabels: [],
    url: "https://trello.com/c/card",
  });
});

/** Start a loopback-only HTTP fixture; each test owns and closes its returned server. */
async function listen(app: ReturnType<typeof express>) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as { port: number };
  return { server, url: `http://127.0.0.1:${address.port}` };
}

test("public skills are discoverable and retrievable through HTTP MCP", async () => {
  const trello = await listen(fake);
  const app = await listen(
    createApp({
      apiBase: trello.url,
      board: "board",
      key: "key",
      token: "token",
      users: [],
      env: {},
    }),
  );
  const client = new Client({ name: "test", version: "1" });
  try {
    const originResponse = await fetch(`${app.url}/mcp`, {
      method: "POST",
      headers: {
        Origin: "https://untrusted.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(originResponse.status, 403);
    const hostStatus = await new Promise<number | undefined>(
      (resolve, reject) => {
        const req = request(
          `${app.url}/mcp`,
          { method: "POST", headers: { Host: "untrusted.example" } },
          (res) => {
            res.resume();
            resolve(res.statusCode);
          },
        );
        req.on("error", reject);
        req.end();
      },
    );
    assert.equal(hostStatus, 403);
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${app.url}/mcp`)),
    );
    const list = await client.callTool({ name: "list_skills", arguments: {} });
    assert.match(JSON.stringify(list), /vendure-best-practices/);
    assert.doesNotMatch(JSON.stringify(list), /storefront-seo/);
    const skill = await client.callTool({
      name: "get_skill",
      arguments: { id: "workflow/refine" },
    });
    assert.match(JSON.stringify(skill), /Refine a task/);
    const traversal = await client.callTool({
      name: "get_skill",
      arguments: { id: "../README" },
    });
    assert.equal(traversal.isError, true);
    assert.equal(records.length, 0);
    const denied = await client.callTool({ name: "get_board", arguments: {} });
    assert.equal(denied.isError, true);
    assert.match(JSON.stringify(denied), /Unauthorized/);
    assert.equal(records.length, 0);
  } finally {
    await client.close();
    app.server.close();
    trello.server.close();
  }
});
