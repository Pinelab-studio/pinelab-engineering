import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "./mcp.js";

// Observe outgoing HTTP requests at the external API boundary, not internal call sequences.
const records: { method: string; path: string; body: any; query?: Record<string, string> }[] = [];
let failComments = false;
let failWrites = false;
let ambiguousSelections = false;
let boardLists = [{ id: "todo", name: "Todo" }, { id: "doing", name: "Doing" }];
let boardCards: Record<string, unknown>[] = [];
const fake = createServer(async (request, response) => {
  let text = "";
  for await (const chunk of request) text += chunk;
  const url = new URL(request.url!, "http://localhost");
  const req = {
    method: request.method!,
    path: url.pathname,
    body: text ? JSON.parse(text) : undefined,
  };
  const res = {
    status(code: number) { response.statusCode = code; return this; },
    json(value: unknown) {
      response.setHeader("Content-Type", "application/json");
      const result = ambiguousSelections && Array.isArray(value) && value.length
        ? [...value, { ...value[0], id: "duplicate" }]
        : value;
      response.end(JSON.stringify(result));
    },
  };
  records.push({
    ...req,
    ...(req.method === "GET" ? {
      query: Object.fromEntries([...url.searchParams].filter(([name]) => !["key", "token"].includes(name))),
    } : {}),
  });
  if (failWrites && req.method !== "GET" && !req.path.endsWith("/comments"))
    return res.status(503).json({ error: "sensitive upstream response" });
  if (req.path.endsWith("/comments"))
    return res.status(failComments ? 500 : 200).json({ id: "comment" });
  if (req.path === "/boards/board") return res.json({ id: "board" });
  if (req.path.endsWith("/lists")) return res.json(boardLists);
  if (req.path.endsWith("/members"))
    return res.json([{ id: "member", username: "developer", fullName: "Developer" }]);
  if (req.path.endsWith("/labels"))
    return res.json([
      { id: "bug", name: "Bug", color: "blue_dark" },
      { id: "client", name: "Client", color: "green" },
    ]);
  if (req.path === "/boards/board/cards") return res.json(boardCards);
  if (req.path.startsWith("/lists/") && req.path.endsWith("/cards"))
    return res.json(boardCards.filter((card) => card.idList === req.path.split("/")[2]));
  if (req.path.endsWith("/actions")) return res.json([]);
  return res.json({
    id: "card",
    idBoard: req.path.includes("foreign") ? "other" : "board",
    name: "Original",
    desc: "Original description",
    idList: "todo",
    idLabels: req.path.includes("labelled") ? ["bug"] : [],
    idMembers: req.path.includes("assigned") ? ["member"] : [],
    url: "https://trello.com/c/card",
  });
});
/** Bind an isolated HTTP fixture to an ephemeral loopback port. */
async function listen(server: ReturnType<typeof createServer>) {
  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return {
    server,
    url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
  };
}
/** Exercise MCP tool permissions in memory; only the external Trello boundary uses HTTP. */
async function scenario(
  token: string | undefined,
  run: (client: Client) => Promise<void>,
) {
  records.length = 0;
  failComments = false;
  failWrites = false;
  ambiguousSelections = false;
  boardLists = [{ id: "todo", name: "Todo" }, { id: "doing", name: "Doing" }];
  boardCards = [];
  const trello = await listen(fake);
  const server = await createMcpServer({
      apiBase: trello.url,
      board: "board",
      key: "key",
      token: "token",
      users: [
        { username: "Reader", token: "reader-secret".repeat(4), permissions: ["read"] },
        { username: "Writer", token: "writer-secret".repeat(4), permissions: ["write"] },
      ],
      env: {},
    }, token ? `Bearer ${token.repeat(4)}` : undefined, async () => JSON.parse(await readFile(new URL("./generated/skills.json", import.meta.url), "utf8")));
  const client = new Client({ name: "test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await run(client);
  } finally {
    await client.close();
    await server.close();
    trello.server.close();
  }
}

test("discover guidance then list Todo cards through the compact Trello entry point", async () =>
  scenario("reader-secret", async (client) => {
    setupCardListing();
    const { tools } = await client.listTools();
    const tool = tools.find(({ name }) => name === "pinelab_trello");
    assert.ok(tool);
    assert.deepEqual(Object.keys(tool.inputSchema.properties!).sort(), ["action", "input"]);
    const help = await client.callTool({ name: "pinelab_trello", arguments: {} });
    assert.notEqual(help.isError, true);
    const discovery = JSON.parse((help.content as { text: string }[])[0].text);
    assert.match(discovery.guidance, /Completed tasks are read-only/);
    assert.equal(discovery.actions.list_cards.inputSchema.properties.list.type, "string");
    assert.equal(records.length, 0);
    const response = await client.callTool({ name: "pinelab_trello", arguments: { action: "list_cards", input: { list: "Todo" } } });
    assert.notEqual(response.isError, true);
    const result = JSON.parse((response.content as { text: string }[])[0].text);
    assert.deepEqual(result.lists, [{ id: "todo", name: "Todo" }, { id: "doing", name: "Doing" }, { id: "empty", name: "Empty" }]);
    assert.deepEqual(result.cards.map((card: { name: string }) => card.name), ["Todo task"]);
  }));

test("invalid dispatcher inputs are rejected without reaching Trello", async () =>
  scenario("reader-secret", async (client) => {
    for (const args of [
      { action: "unknown" },
      { action: "get_card", input: {} },
      { action: "list_cards", input: { typo: "Todo" } },
      { input: { list: "Todo" } },
      { action: "get_board", input: {}, typo: true },
    ]) {
      const response = await client.callTool({ name: "pinelab_trello", arguments: args });
      assert.equal(response.isError, true, JSON.stringify(args));
      assert.equal(records.length, 0);
    }
  }));

test("board context includes lists, labels and assignable usernames in one tool call", async () =>
  scenario("reader-secret", async (client) => {
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "get_board", input: {} } });
    assert.notEqual(result.isError, true);
    const context = JSON.parse((result.content as { text: string }[])[0].text);
    assert.deepEqual(context.lists, [{ id: "todo", name: "Todo" }, { id: "doing", name: "Doing" }]);
    assert.deepEqual(context.labels, [{ id: "bug", name: "Bug", color: "blue_dark" }, { id: "client", name: "Client", color: "green" }]);
    assert.deepEqual(context.members, [{ id: "member", username: "developer", fullName: "Developer" }]);
  }));

test("tool discovery exposes only one Trello entry point and loads update semantics on demand", async () =>
  scenario("reader-secret", async (client) => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.filter(({ name }) => /trello/.test(name)).map(({ name }) => name), ["pinelab_trello"]);
    const tool = tools.find(({ name }) => name === "pinelab_trello")!;
    assert.equal(tool.annotations?.readOnlyHint, false);
    assert.equal(tool.annotations?.destructiveHint, true);
    const response = await client.callTool({ name: "pinelab_trello", arguments: {} });
    const { actions } = JSON.parse((response.content as { text: string }[])[0].text);
    assert.deepEqual(Object.keys(actions).sort(), ["add_comment", "create_card", "get_board", "get_card", "list_cards", "update_card"]);
    const fields = actions.update_card.inputSchema.properties;
    assert.match(fields.labels.description, /Replaces all labels/);
    assert.match(fields.assignees.description, /omitted preserves/);
    assert.equal(records.length, 0);
  }));

test("invalid tokens never reach Trello", async () => {
  await scenario("invalid", async (client) => {
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "get_board", input: {} } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result), /Unauthorized/);
  });
  assert.equal(records.length, 0);
});

test("writer adds exactly one comment without editing the card or checking its list", async () =>
  scenario("writer-secret", async (client) => {
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "add_comment", input: {
      card: "card", text: "Ready for review.",
    } } });
    assert.notEqual(result.isError, true);
    assert.deepEqual(records.filter((r) => r.method !== "GET"), [{
      method: "POST", path: "/cards/card/actions/comments", body: { text: "Ready for review." },
    }]);
    assert.equal(records.some((r) => r.path.endsWith("/lists")), false);
  }));

test("reader cannot add comments", async () =>
  scenario("reader-secret", async (client) => {
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "add_comment", input: {
      card: "card", text: "Not allowed",
    } } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result), /Forbidden/);
    assert.equal(records.length, 0);
  }));

test("comments reject foreign cards and empty text without writing", async () =>
  scenario("writer-secret", async (client) => {
    for (const args of [{ card: "foreign", text: "Hello" }, { card: "card", text: "   " }]) {
      const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "add_comment", input: args } });
      assert.equal(result.isError, true);
    }
    assert.equal(records.some((r) => r.method !== "GET"), false);
  }));

test("comment failures are reported without retrying", async () =>
  scenario("writer-secret", async (client) => {
    failComments = true;
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "add_comment", input: {
      card: "card", text: "Hello",
    } } });
    assert.equal(result.isError, true);
    assert.equal(records.filter((r) => r.path.endsWith("/comments")).length, 1);
  }));

test("writer creates a card with defaults and an attributed comment", async () =>
  scenario("writer-secret", async (client) => {
    const response = await client.callTool({ name: "pinelab_trello", arguments: { action: "create_card", input: { title: "New", description: "Context" } } });
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

test("writer creates a card with confirmed labels and assignees", async () =>
  scenario("writer-secret", async (client) => {
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "create_card", input: {
      title: "Assigned", description: "Context", labels: ["Bug", "Client"], assignees: ["developer", "developer"],
    } } });
    assert.notEqual(result.isError, true);
    assert.deepEqual(records.find((r) => r.method === "POST" && r.path === "/cards")?.body, {
      name: "Assigned", desc: "Context", idList: "todo", idLabels: ["bug", "client"], idMembers: ["member"], pos: "top",
    });
  }));

test("writer updates labels, assignees, list and position in one attributed change", async () =>
  scenario("writer-secret", async (client) => {
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "update_card", input: {
      card: "card", labels: ["Bug", "Bug"], assignees: ["developer", "developer"], list: "Doing", position: "bottom",
    } } });
    assert.notEqual(result.isError, true);
    assert.deepEqual(records.find((r) => r.method === "PUT")?.body, {
      idLabels: ["bug"], idMembers: ["member"], idList: "doing", pos: "bottom",
    });
    assert.equal(records.filter((r) => r.method === "PUT").length, 1);
    assert.deepEqual(records.find((r) => r.path.endsWith("/comments"))?.body, {
      text: "Writer moved this card to Doing; updated the position in Doing; replaced labels with Bug; replaced assignees with developer.",
    });
  }));

test("writer updates only requested fields and records one summary", async () =>
  scenario("writer-secret", async (client) => {
    const response = await client.callTool({ name: "pinelab_trello", arguments: { action: "update_card", input: {
        card: "labelledassigned",
        title: "Changed",
        description: "Changed description",
      } } });
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
    const response = await client.callTool({ name: "pinelab_trello", arguments: { action: "update_card", input: { card: "card", list: "Doing" } } });
    assert.notEqual(response.isError, true);
    assert.deepEqual(records.find((r) => r.method === "PUT")?.body, {
      idList: "doing",
    });
    assert.deepEqual(records.find((r) => r.path.endsWith("/comments"))?.body, {
      text: "Writer moved this card to Doing.",
    });
  }));

test("writer replaces the existing labels with the supplied selection", async () =>
  scenario("writer-secret", async (client) => {
    const response = await client.callTool({ name: "pinelab_trello", arguments: { action: "update_card", input: { card: "labelled", labels: ["Client"] } } });
    assert.notEqual(response.isError, true);
    assert.deepEqual(
      records.find((r) => r.method === "PUT")?.body,
      { idLabels: ["client"] },
    );
    assert.deepEqual(records.find((r) => r.path.endsWith("/comments"))?.body, {
      text: "Writer replaced labels with Client.",
    });
  }));

test("writer clears labels and assignees using empty arrays", async () =>
  scenario("writer-secret", async (client) => {
    const response = await client.callTool({ name: "pinelab_trello", arguments: { action: "update_card", input: { card: "labelledassigned", labels: [], assignees: [] } } });
    assert.notEqual(response.isError, true);
    assert.deepEqual(records.find((r) => r.method === "PUT")?.body, {
      idLabels: "", idMembers: "",
    });
    assert.deepEqual(records.find((r) => r.path.endsWith("/comments"))?.body, {
      text: "Writer cleared labels; cleared assignees.",
    });
  }));

test("reader reads cards, activity and board cards without creating comments", async () =>
  scenario("reader-secret", async (client) => {
    const card = await client.callTool({ name: "pinelab_trello", arguments: { action: "get_card", input: { card: "card" } } });
    assert.notEqual(card.isError, true);
    const list = await client.callTool({ name: "pinelab_trello", arguments: { action: "list_cards", input: {} } });
    assert.notEqual(list.isError, true);
    assert.ok(records.some((r) => r.path === "/cards/card/actions"));
    assert.ok(records.some((r) => r.path === "/boards/board/cards"));
    assert.ok(records.every((r) => r.method === "GET"));
  }));

test("reader lists Todo cards and available lists without fetching all board cards", async () =>
  scenario("reader-secret", async (client) => {
    setupCardListing();
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "list_cards", input: { list: "Todo" } } });
    assert.notEqual(result.isError, true);
    assert.deepEqual(JSON.parse((result.content as { text: string }[])[0].text), {
      lists: [{ id: "todo", name: "Todo" }, { id: "doing", name: "Doing" }, { id: "empty", name: "Empty" }],
      cards: [{ id: "todo-card", name: "Todo task", desc: "Todo context", idBoard: "board", idList: "todo", idLabels: ["bug"], idMembers: ["member"], due: null, url: "https://trello.com/c/todo-card", members: [{ id: "member", username: "developer", fullName: "Developer" }] }],
    });
    assert.deepEqual(records, [
      { method: "GET", path: "/boards/board/lists", body: undefined, query: { filter: "open", fields: "name" } },
      { method: "GET", path: "/lists/todo/cards", body: undefined, query: {
        filter: "open", fields: "name,desc,idBoard,idList,idLabels,idMembers,due,url", members: "true", member_fields: "fullName,username",
      } },
    ]);
  }));

test("reader lists all open board cards and available lists when list is omitted", async () =>
  scenario("reader-secret", async (client) => {
    setupCardListing();
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "list_cards", input: {} } });
    assert.notEqual(result.isError, true);
    assert.deepEqual(JSON.parse((result.content as { text: string }[])[0].text), {
      lists: [{ id: "todo", name: "Todo" }, { id: "doing", name: "Doing" }, { id: "empty", name: "Empty" }],
      cards: [
        { id: "todo-card", name: "Todo task", desc: "Todo context", idBoard: "board", idList: "todo", idLabels: ["bug"], idMembers: ["member"], due: null, url: "https://trello.com/c/todo-card", members: [{ id: "member", username: "developer", fullName: "Developer" }] },
        { id: "doing-card", name: "Doing task", desc: "Doing context", idBoard: "board", idList: "doing", idLabels: [], idMembers: [], due: null, url: "https://trello.com/c/doing-card", members: [] },
      ],
    });
    assert.deepEqual(records, [
      { method: "GET", path: "/boards/board/lists", body: undefined, query: { filter: "open", fields: "name" } },
      { method: "GET", path: "/boards/board/cards", body: undefined, query: {
        filter: "open", fields: "name,desc,idBoard,idList,idLabels,idMembers,due,url", members: "true", member_fields: "fullName,username",
      } },
    ]);
  }));

test("reader lists an empty list without losing available list names", async () =>
  scenario("reader-secret", async (client) => {
    setupCardListing();
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "list_cards", input: { list: "Empty" } } });
    assert.notEqual(result.isError, true);
    assert.deepEqual(JSON.parse((result.content as { text: string }[])[0].text), {
      lists: [{ id: "todo", name: "Todo" }, { id: "doing", name: "Doing" }, { id: "empty", name: "Empty" }],
      cards: [],
    });
    assert.deepEqual(records.map((record) => record.path), ["/boards/board/lists", "/lists/empty/cards"]);
  }));

test("unknown list returns available names without requesting any cards", async () =>
  scenario("reader-secret", async (client) => {
    setupCardListing();
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "list_cards", input: { list: "Unknown" } } });
    assert.equal(result.isError, true);
    assert.equal(JSON.parse((result.content as { text: string }[])[0].text),
      'Missing or ambiguous list: Unknown. Choose an existing, unambiguous name. Available lists: "Todo", "Doing", "Empty".');
    assert.deepEqual(records.map((record) => record.path), ["/boards/board/lists"]);
  }));

test("ambiguous list returns available names without guessing or requesting cards", async () =>
  scenario("reader-secret", async (client) => {
    setupCardListing();
    boardLists.push({ id: "duplicate", name: "Todo" });
    const result = await client.callTool({ name: "pinelab_trello", arguments: { action: "list_cards", input: { list: "Todo" } } });
    assert.equal(result.isError, true);
    assert.equal(JSON.parse((result.content as { text: string }[])[0].text),
      'Missing or ambiguous list: Todo. Choose an existing, unambiguous name. Available lists: "Todo", "Doing", "Empty", "Todo".');
    assert.deepEqual(records.map((record) => record.path), ["/boards/board/lists"]);
  }));

test("card listing discovery documents Kanban lists and the response without Trello requests", async () =>
  scenario("reader-secret", async (client) => {
    const response = await client.callTool({ name: "pinelab_trello", arguments: {} });
    const listing = JSON.parse((response.content as { text: string }[])[0].text).actions.list_cards;
    assert.match(listing.description!, /Lists: Inbox, Waiting For Client Approval, Todo, Doing, Ready For Review, ✨Done\./);
    assert.match(listing.description!, /Returns \{ lists, cards \}, including all current open lists/);
    assert.match(listing.description!, /No board discovery needed/);
    const fields = listing.inputSchema.properties as Record<string, { type: string; description: string; enum?: string[] }>;
    assert.equal(fields.list.type, "string");
    assert.equal(fields.list.enum, undefined);
    assert.match(fields.list.description, /Exact existing list name/);
    assert.match(fields.list.description, /omitted returns all open board cards/);
    assert.equal(records.length, 0);
  }));

test("all tools enforce their permission before calling Trello", async () => {
  const writes = [
    ["create_card", { title: "New", description: "Context" }],
    ["update_card", { card: "card", title: "Changed" }],
    ["update_card", { card: "card", list: "Doing", labels: ["Bug"], assignees: ["developer"] }],
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
          (await client.callTool({ name: "pinelab_trello", arguments: { action: name, input: args } })).isError,
          true,
          name,
        );
      }
      if (token !== "reader-secret") {
        for (const [name, args] of reads)
          assert.equal(
            (await client.callTool({ name: "pinelab_trello", arguments: { action: name, input: args } })).isError,
            true,
            name,
          );
      }
      assert.equal(records.length, 0);
    });
  }
  await scenario("writer-secret", async (client) => {
    for (const [name, args] of reads) {
      const response = await client.callTool({ name: "pinelab_trello", arguments: { action: name, input: args } });
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
      ["update_card", { card: "foreign", list: "Doing", labels: ["Bug"], assignees: ["developer"] }],
    ] as const) {
      const response = await client.callTool({ name: "pinelab_trello", arguments: { action: name, input: args } });
      assert.equal(response.isError, true);
      assert.match(JSON.stringify(response), /outside the configured board/);
    }
    assert.ok(records.every((r) => r.method === "GET"));
  }));

test("comment failure does not fail or repeat a successful mutation", async () =>
  scenario("writer-secret", async (client) => {
    failComments = true;
    const response = await client.callTool({ name: "pinelab_trello", arguments: { action: "update_card", input: { card: "card", title: "Changed" } } });
    assert.notEqual(response.isError, true);
    assert.equal(records.filter((r) => r.method === "PUT").length, 1);
    assert.equal(records.filter((r) => r.path.endsWith("/comments")).length, 1);
  }));

test("unknown list, label or assignee rejects the entire create/update before any mutation", async () =>
  scenario("writer-secret", async (client) => {
    for (const selection of [{ list: "Unknown" }, { labels: ["Unknown"] }, { assignees: ["Unknown"] }]) {
      for (const name of ["create_card", "update_card"]) {
        const response = await client.callTool({ name: "pinelab_trello", arguments: { action: name, input: {
          ...(name === "update_card" ? { card: "card" } : {}), title: "Changed", description: "Context", ...selection,
        } } });
        assert.equal(response.isError, true, JSON.stringify({ name, selection, response }));
        assert.match(JSON.stringify(response), /Missing or ambiguous/);
      }
    }
    assert.ok(records.every((r) => r.method === "GET"));
  }));

test("ambiguous selections reject create/update without guessing or partially writing", async () =>
  scenario("writer-secret", async (client) => {
    ambiguousSelections = true;
    for (const selection of [{ list: "Todo" }, { list: "Doing", labels: ["Bug"] }, { list: "Doing", assignees: ["developer"] }]) {
      for (const name of ["create_card", "update_card"]) {
        const response = await client.callTool({ name: "pinelab_trello", arguments: { action: name, input: {
          ...(name === "update_card" ? { card: "card" } : {}), title: "Changed", description: "Context", ...selection,
        } } });
        assert.equal(response.isError, true);
        assert.match(JSON.stringify(response), /Missing or ambiguous/);
      }
    }
    assert.ok(records.every((r) => r.method === "GET"));
  }));

test("failed writes are reported without upstream details or success comments", async () =>
  scenario("writer-secret", async (client) => {
    failWrites = true;
    const response = await client.callTool({ name: "pinelab_trello", arguments: { action: "update_card", input: { card: "card", title: "Changed" } } });
    assert.equal(response.isError, true);
    assert.match(JSON.stringify(response), /HTTP 503/);
    assert.doesNotMatch(JSON.stringify(response), /sensitive upstream/);
    assert.equal(records.filter((r) => r.method === "PUT").length, 1);
    assert.equal(records.filter((r) => r.path.endsWith("/comments")).length, 0);
  }));

test("no-op updates do not write or add comments", async () =>
  scenario("writer-secret", async (client) => {
    const response = await client.callTool({ name: "pinelab_trello", arguments: { action: "update_card", input: { card: "labelledassigned", title: "Original", list: "Todo", labels: ["Bug", "Bug"], assignees: ["developer", "developer"] } } });
    assert.notEqual(response.isError, true);
    assert.ok(records.every((r) => r.method === "GET"));
  }));

test("cross-board reads do not fetch activity", async () =>
  scenario("reader-secret", async (client) => {
    const response = await client.callTool({ name: "pinelab_trello", arguments: { action: "get_card", input: { card: "foreign" } } });
    assert.equal(response.isError, true);
    assert.match(JSON.stringify(response), /outside the configured board/);
    assert.ok(!records.some((r) => r.path.endsWith("/actions")));
  }));

test("reader can read board but cannot create cards", async () =>
  scenario("reader-secret", async (client) => {
    assert.notEqual(
      (await client.callTool({ name: "pinelab_trello", arguments: { action: "get_board", input: {} } })).isError,
      true,
    );
    assert.deepEqual(
      records.map((r) => r.path),
      ["/boards/board", "/boards/board/lists", "/boards/board/labels", "/boards/board/members"],
    );
    records.length = 0;
    const denied = await client.callTool({ name: "pinelab_trello", arguments: { action: "create_card", input: { title: "New", description: "Context" } } });
    assert.equal(denied.isError, true);
    assert.match(JSON.stringify(denied), /Forbidden/);
    assert.equal(records.length, 0);
  }));

/** Populate the existing HTTP fixture with distinct lists and cards for public listing tests. */
function setupCardListing() {
  boardLists.push({ id: "empty", name: "Empty" });
  boardCards.push(
    { id: "todo-card", name: "Todo task", desc: "Todo context", idBoard: "board", idList: "todo", idLabels: ["bug"], idMembers: ["member"], due: null, url: "https://trello.com/c/todo-card", members: [{ id: "member", username: "developer", fullName: "Developer" }] },
    { id: "doing-card", name: "Doing task", desc: "Doing context", idBoard: "board", idList: "doing", idLabels: [], idMembers: [], due: null, url: "https://trello.com/c/doing-card", members: [] },
  );
}
