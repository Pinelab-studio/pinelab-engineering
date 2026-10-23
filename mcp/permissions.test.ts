import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "./server.js";

const records: { method: string; path: string; body: any }[] = [];
let failComments = false;
let failWrites = false;
const fake = express();
fake.use(express.json());
fake.use((req, res) => {
  records.push({ method: req.method, path: req.path, body: req.body });
  if (failWrites && req.method !== "GET" && !req.path.endsWith("/comments"))
    return res.status(503).json({ error: "sensitive upstream response" });
  if (req.path.endsWith("/comments"))
    return res.status(failComments ? 500 : 200).json({ id: "comment" });
  if (req.path === "/boards/board") return res.json({ id: "board" });
  if (req.path.endsWith("/lists"))
    return res.json([
      { id: "todo", name: "Todo" },
      { id: "doing", name: "Doing" },
    ]);
  if (req.path.endsWith("/labels"))
    return res.json([
      { id: "bug", name: "Bug", color: "blue_dark" },
      { id: "client", name: "Client", color: "green" },
    ]);
  if (req.path.endsWith("/actions") || req.path === "/boards/board/cards")
    return res.json([]);
  return res.json({
    id: "card",
    idBoard: req.path.includes("foreign") ? "other" : "board",
    name: "Original",
    desc: "Original description",
    idList: "todo",
    idLabels: req.path.includes("labelled") ? ["bug"] : [],
    url: "https://trello.com/c/card",
  });
});
async function listen(app: ReturnType<typeof express>) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return {
    server,
    url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
  };
}
async function scenario(
  token: string | undefined,
  run: (client: Client) => Promise<void>,
) {
  records.length = 0;
  failComments = false;
  failWrites = false;
  const trello = await listen(fake);
  const app = await listen(
    createApp({
      apiBase: trello.url,
      board: "board",
      key: "key",
      token: "token",
      users: [
        { username: "Reader", tokenEnv: "READ", permissions: ["read"] },
        { username: "Writer", tokenEnv: "WRITE", permissions: ["write"] },
      ],
      env: { READ: "reader-secret", WRITE: "writer-secret" },
    }),
  );
  const client = new Client({ name: "test", version: "1" });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${app.url}/mcp`), {
        requestInit: {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      }),
    );
    await run(client);
  } finally {
    await client.close();
    app.server.close();
    trello.server.close();
  }
}

test("invalid tokens never reach Trello", async () =>
  scenario("invalid", async (client) => {
    const response = await client.callTool({
      name: "get_board",
      arguments: {},
    });
    assert.equal(response.isError, true);
    assert.match(JSON.stringify(response), /Unauthorized/);
    assert.equal(records.length, 0);
  }));

test("writer creates a card with defaults and an attributed comment", async () =>
  scenario("writer-secret", async (client) => {
    const response = await client.callTool({
      name: "create_card",
      arguments: { title: "New", description: "Context" },
    });
    assert.notEqual(response.isError, true);
    assert.deepEqual(
      records.find((r) => r.method === "POST" && r.path === "/cards")?.body,
      {
        name: "New",
        desc: "Context",
        idList: "todo",
        idLabels: [],
        pos: "top",
      },
    );
    assert.deepEqual(records.find((r) => r.path.endsWith("/comments"))?.body, {
      text: "Writer created this card in Todo.",
    });
  }));

test("writer updates only requested fields and records one summary", async () =>
  scenario("writer-secret", async (client) => {
    const response = await client.callTool({
      name: "update_card",
      arguments: {
        card: "card",
        title: "Changed",
        description: "Changed description",
      },
    });
    assert.notEqual(response.isError, true);
    assert.deepEqual(records.find((r) => r.method === "PUT")?.body, {
      name: "Changed",
      desc: "Changed description",
    });
    assert.deepEqual(records.find((r) => r.path.endsWith("/comments"))?.body, {
      text: "Writer updated the title; updated the description.",
    });
  }));

test("writer moves cards using resolved list names", async () =>
  scenario("writer-secret", async (client) => {
    const response = await client.callTool({
      name: "move_card",
      arguments: { card: "card", list: "Doing" },
    });
    assert.notEqual(response.isError, true);
    assert.deepEqual(records.find((r) => r.method === "PUT")?.body, {
      idList: "doing",
    });
    assert.deepEqual(records.find((r) => r.path.endsWith("/comments"))?.body, {
      text: "Writer moved this card to Doing.",
    });
  }));

test("writer adds an existing label without replacing other labels", async () =>
  scenario("writer-secret", async (client) => {
    const response = await client.callTool({
      name: "add_label",
      arguments: { card: "card", label: "Bug" },
    });
    assert.notEqual(response.isError, true);
    assert.deepEqual(
      records.find((r) => r.path === "/cards/card/idLabels")?.body,
      { value: "bug" },
    );
    assert.deepEqual(records.find((r) => r.path.endsWith("/comments"))?.body, {
      text: "Writer added label Bug.",
    });
  }));

test("writer removes an assigned label and attributes the change", async () =>
  scenario("writer-secret", async (client) => {
    const response = await client.callTool({
      name: "remove_label",
      arguments: { card: "labelled", label: "Bug" },
    });
    assert.notEqual(response.isError, true);
    assert.equal(
      records.find((r) => r.method === "DELETE")?.path,
      "/cards/card/idLabels/bug",
    );
    assert.deepEqual(records.find((r) => r.path.endsWith("/comments"))?.body, {
      text: "Writer removed label Bug.",
    });
  }));

test("reader reads cards, activity and board cards without creating comments", async () =>
  scenario("reader-secret", async (client) => {
    const card = await client.callTool({
      name: "get_card",
      arguments: { card: "card" },
    });
    assert.notEqual(card.isError, true);
    const list = await client.callTool({ name: "list_cards", arguments: {} });
    assert.notEqual(list.isError, true);
    assert.ok(records.some((r) => r.path === "/cards/card/actions"));
    assert.ok(records.some((r) => r.path === "/boards/board/cards"));
    assert.ok(records.every((r) => r.method === "GET"));
  }));

test("all tools enforce their permission before calling Trello", async () => {
  const writes = [
    ["create_card", { title: "New", description: "Context" }],
    ["update_card", { card: "card", title: "Changed" }],
    ["move_card", { card: "card", list: "Doing" }],
    ["add_label", { card: "card", label: "Bug" }],
    ["remove_label", { card: "card", label: "Bug" }],
  ] as const;
  const reads = [
    ["get_board", {}],
    ["list_cards", {}],
    ["get_card", { card: "card" }],
  ] as const;
  for (const token of [undefined, "invalid", "reader-secret"]) {
    await scenario(token, async (client) => {
      for (const [name, args] of writes) {
        assert.equal(
          (await client.callTool({ name, arguments: args })).isError,
          true,
          name,
        );
      }
      if (token !== "reader-secret") {
        for (const [name, args] of reads)
          assert.equal(
            (await client.callTool({ name, arguments: args })).isError,
            true,
            name,
          );
      }
      assert.equal(records.length, 0);
    });
  }
  await scenario("writer-secret", async (client) => {
    for (const [name, args] of reads) {
      const response = await client.callTool({ name, arguments: args });
      assert.equal(response.isError, true);
      assert.match(JSON.stringify(response), /Forbidden/);
    }
    assert.equal(records.length, 0);
  });
});

test("cross-board mutations and reads are rejected without writes", async () =>
  scenario("writer-secret", async (client) => {
    for (const [name, args] of [
      ["update_card", { card: "foreign", title: "Changed" }],
      ["move_card", { card: "foreign", list: "Doing" }],
      ["add_label", { card: "foreign", label: "Bug" }],
      ["remove_label", { card: "foreign", label: "Bug" }],
    ] as const) {
      const response = await client.callTool({ name, arguments: args });
      assert.equal(response.isError, true);
      assert.match(JSON.stringify(response), /outside the configured board/);
    }
    assert.ok(records.every((r) => r.method === "GET"));
  }));

test("comment failure does not fail or repeat a successful mutation", async () =>
  scenario("writer-secret", async (client) => {
    failComments = true;
    const response = await client.callTool({
      name: "update_card",
      arguments: { card: "card", title: "Changed" },
    });
    assert.notEqual(response.isError, true);
    assert.equal(records.filter((r) => r.method === "PUT").length, 1);
    assert.equal(records.filter((r) => r.path.endsWith("/comments")).length, 1);
  }));

test("missing destinations and labels cannot cause mutations", async () =>
  scenario("writer-secret", async (client) => {
    assert.equal(
      (
        await client.callTool({
          name: "move_card",
          arguments: { card: "card", list: "Unknown" },
        })
      ).isError,
      true,
    );
    assert.equal(
      (
        await client.callTool({
          name: "add_label",
          arguments: { card: "card", label: "Unknown" },
        })
      ).isError,
      true,
    );
    assert.ok(records.every((r) => r.method === "GET"));
  }));

test("failed writes are reported without upstream details or success comments", async () =>
  scenario("writer-secret", async (client) => {
    failWrites = true;
    const response = await client.callTool({
      name: "update_card",
      arguments: { card: "card", title: "Changed" },
    });
    assert.equal(response.isError, true);
    assert.match(JSON.stringify(response), /HTTP 503/);
    assert.doesNotMatch(JSON.stringify(response), /sensitive upstream/);
    assert.equal(records.filter((r) => r.method === "PUT").length, 1);
    assert.equal(records.filter((r) => r.path.endsWith("/comments")).length, 0);
  }));

test("no-op updates do not write or add comments", async () =>
  scenario("writer-secret", async (client) => {
    const response = await client.callTool({
      name: "update_card",
      arguments: { card: "card", title: "Original" },
    });
    assert.notEqual(response.isError, true);
    assert.ok(records.every((r) => r.method === "GET"));
  }));

test("cross-board reads do not fetch activity", async () =>
  scenario("reader-secret", async (client) => {
    const response = await client.callTool({
      name: "get_card",
      arguments: { card: "foreign" },
    });
    assert.equal(response.isError, true);
    assert.match(JSON.stringify(response), /outside the configured board/);
    assert.ok(!records.some((r) => r.path.endsWith("/actions")));
  }));

test("reader can read board but cannot create cards", async () =>
  scenario("reader-secret", async (client) => {
    assert.notEqual(
      (await client.callTool({ name: "get_board", arguments: {} })).isError,
      true,
    );
    assert.deepEqual(
      records.map((r) => r.path),
      ["/boards/board", "/boards/board/lists", "/boards/board/labels"],
    );
    records.length = 0;
    const denied = await client.callTool({
      name: "create_card",
      arguments: { title: "New", description: "Context" },
    });
    assert.equal(denied.isError, true);
    assert.match(JSON.stringify(denied), /Forbidden/);
    assert.equal(records.length, 0);
  }));
