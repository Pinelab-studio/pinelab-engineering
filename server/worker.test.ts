import { test } from "node:test";
import assert from "node:assert/strict";
import { unstable_dev } from "wrangler";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Run the actual bundle in local workerd, not an emulation of the fetch handler in Node.
test(
  "Workers runtime serves bundled skills and rejects unauthorized Trello calls",
  { timeout: 60000 },
  async () => {
    const worker = await unstable_dev("server/worker.ts", {
      config: "wrangler.jsonc",
      local: true,
      ip: "127.0.0.1",
      port: 0,
      logLevel: "error",
      persist: false,
      vars: {
        TRELLO_API_KEY: "test-key",
        TRELLO_API_TOKEN: "test-token",
        TRELLO_BOARD_ID: "test-board",
        MARTIJN_MCP_TOKEN: "a".repeat(64),
      },
      experimental: { disableExperimentalWarning: true, watch: false },
    });
    try {
      const endpoint = new URL(`http://${worker.address}:${worker.port}/mcp`);
      for (const token of [undefined, "invalid", "a".repeat(64)]) {
        const client = new Client({ name: "worker-test", version: "1" });
        try {
          await client.connect(
            new StreamableHTTPClientTransport(endpoint, {
              requestInit: {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              },
            }),
          );
          const skills = await client.callTool({
            name: "list_skills",
            arguments: {},
          });
          assert.notEqual(skills.isError, true);
          assert.match(JSON.stringify(skills), /vendure-best-practices/);
          assert.doesNotMatch(JSON.stringify(skills), /storefront-seo/);
          const article = await client.callTool({
            name: "get_skill",
            arguments: { id: "workflow/refine" },
          });
          assert.match(JSON.stringify(article), /Refine a task/);
          if (token !== "a".repeat(64)) {
            const denied = await client.callTool({
              name: "create_card",
              arguments: {
                title: "Never create",
                description: "Must not reach Trello",
              },
            });
            assert.equal(denied.isError, true);
            assert.match(JSON.stringify(denied), /Unauthorized/);
          }
        } finally {
          await client.close();
        }
      }
      assert.equal(
        (
          await fetch(endpoint, {
            method: "POST",
            headers: { Origin: "https://untrusted.example" },
          })
        ).status,
        403,
      );
      assert.equal((await fetch(endpoint)).status, 405);
      assert.equal((await fetch(new URL("/missing", endpoint))).status, 404);
    } finally {
      await worker.stop();
    }
  },
);
