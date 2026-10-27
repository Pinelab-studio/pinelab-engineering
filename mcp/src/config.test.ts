import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "./config.js";

test("missing bindings log a copyable template without throwing or exposing secrets", (t) => {
  const log = t.mock.method(console, "error", () => {});
  assert.doesNotThrow(() => loadConfig({}));
  const message = log.mock.calls[0].arguments[0] as string;
  for (const name of ["TRELLO_API_KEY", "TRELLO_API_TOKEN", "TRELLO_BOARD_ID", "API_KEYS"])
    assert.match(message, new RegExp(`^${name}=$`, "m"));
  loadConfig({});
  assert.equal(log.mock.callCount(), 2);
  loadConfig({ TRELLO_API_KEY: "never-log-this-value" });
  const partial = log.mock.calls[2].arguments[0] as string;
  assert.doesNotMatch(partial, /TRELLO_API_KEY=|never-log-this-value/);
  loadConfig({ TRELLO_API_KEY: "key", TRELLO_API_TOKEN: "token", TRELLO_BOARD_ID: "board", API_KEYS: `martijn:${"a".repeat(64)}` });
  assert.equal(log.mock.callCount(), 3);
});

test("API_KEYS dynamically defines read/write users and rejects malformed or duplicate entries", () => {
  const firstKey = "a".repeat(64);
  const secondKey = "b".repeat(64);
  const config = loadConfig({ API_KEYS: ` martijn:${firstKey} , ayoub:${secondKey} ` });
  assert.deepEqual(config.users, [
    { username: "martijn", token: firstKey, permissions: ["read", "write"] },
    { username: "ayoub", token: secondKey, permissions: ["read", "write"] },
  ]);
  assert.deepEqual(loadConfig({ API_KEYS: `ayoub:${secondKey}` }).users.map((user) => user.username), ["ayoub"]);
  for (const apiKeys of [
    `martijn:${firstKey},broken`,
    `martijn:${firstKey},martijn:${secondKey}`,
    `martijn:${firstKey},ayoub:${firstKey}`,
    `martijn:${"short"}`,
    `martijn:${"c".repeat(32)} whitespace`,
  ]) assert.deepEqual(loadConfig({ API_KEYS: apiKeys }).users, []);
});
