import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../src/mcp.js";

const key = "test-api-key";
const redactionKey = "redacted-key";
const token = "secret-api-token";
const bearer = "secret-bearer-value".repeat(3);

async function fixture(t: TestContext, mode: "http" | "json" | "network") {
  const logs = t.mock.method(console, "error", () => {});
  const upstream = createServer((req, res) => {
    if (mode === "network") { req.socket.destroy(); return; }
    res.statusCode = mode === "http" ? 400 : 200;
    res.end(mode === "http"
      ? `invalid board; ${key} ${encodeURIComponent(token)} ${bearer} ${"x".repeat(5000)}`
      : `invalid JSON ${key}`);
  });
  upstream.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => upstream.once("listening", resolve));
  t.after(() => { upstream.close(); });
  const server = await createMcpServer({
    apiBase: `http://127.0.0.1:${(upstream.address() as { port: number }).port}`,
    board: "board", key: redactionKey, token,
    users: [{ username: "test", token: bearer, permissions: ["read"] }],
    env: {},
  }, `Bearer ${bearer}`, async () => []);
  const client = new Client({ name: "logging-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  t.after(async () => { await client.close(); await server.close(); });
  return { client, logs };
}

test("invalid Trello JSON logs status and path without leaking response contents", async (t) => {
  const { client, logs } = await fixture(t, "json");
  const result = await client.callTool({ name: "get_board", arguments: {} });
  assert.equal(result.isError, true);
  assert.match(JSON.stringify(result), /Invalid Trello response/);
  assert.equal(logs.mock.callCount(), 1);
  const logged = JSON.stringify(logs.mock.calls[0].arguments);
  assert.match(logged, /Trello invalid JSON/);
  assert.match(logged, /200/);
  assert.match(logged, /\/boards\/board/);
  for (const secret of [key, token, bearer]) assert.ok(!logged.includes(secret));
});

test("Trello network failures log safe diagnostics without raw fetch errors", async (t) => {
  const { client, logs } = await fixture(t, "network");
  const result = await client.callTool({ name: "get_board", arguments: {} });
  assert.equal(result.isError, true);
  assert.equal(logs.mock.callCount(), 1);
  const logged = JSON.stringify(logs.mock.calls[0].arguments);
  assert.match(logged, /Trello network error/);
  assert.match(logged, /GET/);
  assert.match(logged, /\/boards\/board/);
  assert.doesNotMatch(logged, /http:\/\/|fetch failed/);
  for (const secret of [key, token, bearer]) assert.ok(!logged.includes(secret));
});

test("Trello HTTP failures log bounded, redacted diagnostics but keep tool errors sanitized", async (t) => {
  const { client, logs } = await fixture(t, "http");
  const result = await client.callTool({ name: "get_board", arguments: {} });
  assert.equal(result.isError, true);
  assert.match(JSON.stringify(result), /Trello returned HTTP 400/);
  assert.doesNotMatch(JSON.stringify(result), /invalid board/);
  assert.equal(logs.mock.callCount(), 1);
  const logged = JSON.stringify(logs.mock.calls[0].arguments);
  assert.match(logged, /GET/);
  assert.match(logged, /\/boards\/board/);
  assert.match(logged, /400/);
  assert.match(logged, /invalid board/);
  assert.match(logged, /REDACTED/);
  assert.ok(!logged.includes(token));
  assert.ok(!logged.includes(bearer));
  assert.ok(!logged.includes(redactionKey));
  assert.ok(logged.length < 2500);
});
