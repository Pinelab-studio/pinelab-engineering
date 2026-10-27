import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { unstable_dev } from "wrangler";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const bearer = "a".repeat(64);
const card = { id: "card", idBoard: "board", name: "Test title", desc: "Test description", idLabels: ["bug"], idList: "todo", idMembers: ["member"] };

test("MCP end-to-end through workerd with a mock Trello HTTP boundary", { timeout: 60000 }, async (t) => {
  const requests: { method: string; path: string; body: any }[] = [];
  const trello = createServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    const url = new URL(req.url!, "http://localhost");
    requests.push({ method: req.method!, path: url.pathname, body: text ? JSON.parse(text) : undefined });
    assert.equal(url.searchParams.get("key"), "test-key");
    assert.equal(url.searchParams.get("token"), "test-token");
    if (url.pathname === "/1/cards/redirect") {
      res.writeHead(302, { Location: "/must-not-follow" });
      res.end();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    const value = url.pathname === "/1/boards/board" ? { id: "board" }
      : url.pathname.endsWith("/lists") ? [{ id: "todo", name: "Todo" }]
      : url.pathname.endsWith("/labels") ? [{ id: "bug", name: "Bug", color: "blue_dark" }]
      : url.pathname.endsWith("/members") ? [{ id: "member", username: "developer", fullName: "Developer" }]
      : url.pathname.endsWith("/actions") ? []
      : url.pathname.endsWith("/comments") ? { id: "comment" }
      : card;
    res.end(JSON.stringify(value));
  });
  trello.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => trello.once("listening", resolve));
  t.after(() => { trello.close(); });
  const origin = `http://127.0.0.1:${(trello.address() as { port: number }).port}`;
  const start = async (missingTrello = false, missingApiKeys = false) => {
    const worker = await unstable_dev("test/worker.ts", {
      config: "wrangler.jsonc", local: true, ip: "127.0.0.1", port: 0,
      logLevel: "error", persist: false,
      vars: {
        TRELLO_API_KEY: missingTrello ? "" : "test-key",
        TRELLO_API_TOKEN: missingTrello ? "" : "test-token",
        TRELLO_BOARD_ID: "board", API_KEYS: missingApiKeys ? "" : `martijn:${bearer},ayoub:${"b".repeat(64)}`,
        TEST_TRELLO_ORIGIN: origin,
      },
      experimental: { disableExperimentalWarning: true, watch: false },
    });
    return { worker, endpoint: new URL(`http://${worker.address}:${worker.port}/mcp`) };
  };
  const connect = async (endpoint: URL) => {
    const client = new Client({ name: "e2e", version: "1" });
    await client.connect(new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { Authorization: `Bearer ${bearer}` } },
    }));
    return client;
  };

  const valid = await start();
  try {
    await t.test("both configured API keys authenticate with read/write access", async () => {
      for (const key of [bearer, "b".repeat(64)]) {
        const response = await fetch(valid.endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_skill", arguments: { id: "workflow/refine" } } }),
        });
        assert.equal(response.status, 200);
      }
    });
    await t.test("skill read succeeds with bearer token", async () => {
      const client = await connect(valid.endpoint);
      try {
        const result = await client.callTool({ name: "get_skill", arguments: { id: "workflow/refine" } });
        assert.notEqual(result.isError, true);
        assert.match(JSON.stringify(result), /Refine a task/);
        assert.equal(requests.length, 0);
      } finally { await client.close(); }
    });
    await t.test("board context includes lists, labels and members", async () => {
      const client = await connect(valid.endpoint);
      try {
        const result = await client.callTool({ name: "get_board", arguments: {} });
        assert.notEqual(result.isError, true);
        assert.deepEqual(JSON.parse((result.content as { text: string }[])[0].text), {
          board: { id: "board" }, lists: [{ id: "todo", name: "Todo" }],
          labels: [{ id: "bug", name: "Bug", color: "blue_dark" }],
          members: [{ id: "member", username: "developer", fullName: "Developer" }],
        });
      } finally { await client.close(); }
    });
    await t.test("create card succeeds with bearer token, label, assignee, title and description", async () => {
      requests.length = 0;
      const client = await connect(valid.endpoint);
      try {
        const result = await client.callTool({ name: "create_card", arguments: {
          title: "Test title", description: "Test description", labels: ["Bug"], assignees: ["developer"],
        } });
        assert.notEqual(result.isError, true, JSON.stringify(result));
        assert.deepEqual(JSON.parse((result.content as { text: string }[])[0].text).card, card);
        const create = requests.find((request) => request.method === "POST" && request.path === "/1/cards");
        assert.deepEqual(create?.body, {
          name: "Test title", desc: "Test description", idList: "todo", idLabels: ["bug"], idMembers: ["member"], pos: "top",
        });
      } finally { await client.close(); }
    });
    await t.test("update clears selections and sets position without sending omitted fields", async () => {
      requests.length = 0;
      const client = await connect(valid.endpoint);
      try {
        const result = await client.callTool({ name: "update_card", arguments: {
          card: "card", labels: [], assignees: [], position: "bottom",
        } });
        assert.notEqual(result.isError, true, JSON.stringify(result));
        assert.deepEqual(requests.find((request) => request.method === "PUT")?.body, {
          idLabels: "", idMembers: "", pos: "bottom",
        });
        assert.equal(requests.filter((request) => request.method === "PUT").length, 1);
      } finally { await client.close(); }
    });
    await t.test("read card succeeds with bearer token", async () => {
      const client = await connect(valid.endpoint);
      try {
        const result = await client.callTool({ name: "get_card", arguments: { card: "card" } });
        assert.notEqual(result.isError, true);
        assert.deepEqual(JSON.parse((result.content as { text: string }[])[0].text), {
          card, activity: [], nextBefore: null,
        });
      } finally { await client.close(); }
    });
    await t.test("workflow skill descriptions include pinelab", async () => {
      const client = await connect(valid.endpoint);
      try {
        const result = await client.callTool({ name: "list_skills", arguments: {} });
        assert.notEqual(result.isError, true);
        const skills = JSON.parse((result.content as { text: string }[])[0].text) as { id: string; description: string }[];
        assert.ok(skills.some((skill) => skill.id.startsWith("workflow/")));
        assert.ok(skills.some((skill) => skill.id.startsWith("best-practices/")));
        const missing = [
          ...skills.filter((skill) => skill.id.startsWith("workflow/") && !/\bpinelab\b/i.test(skill.description)).map((skill) => `skill: ${skill.id}`),
        ];
        assert.deepEqual(missing, [], `Descriptions missing pinelab:\n${missing.join("\n")}`);
      } finally { await client.close(); }
    });
    await t.test("discovery, skill catalogue and HTTP security regressions", async () => {
      const client = await connect(valid.endpoint);
      try {
        const skills = await client.callTool({ name: "list_skills", arguments: {} });
        assert.notEqual(skills.isError, true);
        assert.match(JSON.stringify(skills), /vendure-best-practices/);
        assert.doesNotMatch(JSON.stringify(skills), /storefront-seo/);
        const unknown = await client.callTool({ name: "get_skill", arguments: { id: "../README" } });
        assert.equal(unknown.isError, true);
        assert.ok((await client.listTools()).tools.some((tool) => tool.name === "create_card"));
      } finally { await client.close(); }
      assert.equal((await fetch(valid.endpoint, { method: "POST", headers: { Authorization: "Bearer invalid" } })).status, 403);
      assert.equal((await fetch(valid.endpoint, { method: "POST", headers: { Authorization: `Bearer ${bearer}`, Origin: "https://untrusted.example" } })).status, 403);
      assert.equal((await fetch(valid.endpoint)).status, 403);
      assert.equal((await fetch(valid.endpoint, { headers: { Authorization: `Bearer ${bearer}` } })).status, 405);
      assert.equal((await fetch(new URL("/missing", valid.endpoint))).status, 404);
    });
    await t.test("Trello redirects are rejected without following them", async () => {
      requests.length = 0;
      const client = await connect(valid.endpoint);
      try {
        const result = await client.callTool({ name: "get_card", arguments: { card: "redirect" } });
        assert.equal(result.isError, true);
        assert.match(JSON.stringify(result), /Trello returned HTTP 302/);
        assert.deepEqual(requests.map((request) => request.path), ["/1/boards/board", "/1/cards/redirect"]);
      } finally { await client.close(); }
    });
    for (const [name, args] of [
      ["create_card", { title: "Never create", description: "Denied" }],
      ["get_card", { card: "card" }],
      ["get_skill", { id: "workflow/refine" }],
    ] as const) {
      await t.test(`${name} fails with HTTP 403 without bearer token`, async () => {
        requests.length = 0;
        const response = await fetch(valid.endpoint, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
        });
        assert.equal(response.status, 403);
        assert.equal(requests.length, 0);
      });
    }
  } finally { await valid.worker.stop(); }

  const missing = await start(true);
  try {
    for (const [name, args] of [
      ["create_card", { title: "Never create", description: "No credentials" }],
      ["get_card", { card: "card" }],
    ] as const) {
      await t.test(`${name} returns a tool error without Trello credentials`, async () => {
        requests.length = 0;
        const client = await connect(missing.endpoint);
        try {
          const result = await client.callTool({ name, arguments: args });
          assert.equal(result.isError, true);
          assert.match(JSON.stringify(result), /Trello configuration is incomplete/);
          assert.equal(requests.length, 0);
          // The server remains usable after rejecting a Trello call.
          const skill = await client.callTool({ name: "get_skill", arguments: { id: "workflow/refine" } });
          assert.notEqual(skill.isError, true);
          assert.equal(requests.length, 0);
        } finally { await client.close(); }
      });
    }
  } finally { await missing.worker.stop(); }

  const noKeys = await start(false, true);
  try {
    assert.equal((await fetch(noKeys.endpoint, { method: "POST", headers: { Authorization: `Bearer ${bearer}` } })).status, 403);
  } finally { await noKeys.worker.stop(); }
});
