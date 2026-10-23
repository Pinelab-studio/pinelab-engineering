import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "./config.js";

test("missing bindings log a copyable template without throwing or exposing secrets", (t) => {
  const log = t.mock.method(console, "error", () => {});
  assert.doesNotThrow(() => loadConfig({}));
  const message = log.mock.calls[0].arguments[0] as string;
  for (const name of ["TRELLO_API_KEY", "TRELLO_API_TOKEN", "TRELLO_BOARD_ID", "MARTIJN_MCP_TOKEN"])
    assert.match(message, new RegExp(`^${name}=$`, "m"));
  loadConfig({});
  assert.equal(log.mock.callCount(), 1);
  loadConfig({ TRELLO_API_KEY: "never-log-this-value" });
  const partial = log.mock.calls[1].arguments[0] as string;
  assert.doesNotMatch(partial, /TRELLO_API_KEY=|never-log-this-value/);
  loadConfig({ TRELLO_API_KEY: "key", TRELLO_API_TOKEN: "token", TRELLO_BOARD_ID: "board", MARTIJN_MCP_TOKEN: "a".repeat(64) });
  assert.equal(log.mock.callCount(), 2);
});
