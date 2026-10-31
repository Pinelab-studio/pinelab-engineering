import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../mcp.js";
import { createTrelloHelpers, id, name, pos, cardInput } from "./trello-helpers.js";

/** Register tool definitions using request-scoped, permission-checked helpers. */
export function registerTrello(
  server: McpServer,
  config: Config,
  authorization: string | undefined,
) {
  const { tool, api, board, lists, labels, members, card, resolve, comment } =
    createTrelloHelpers(server, config, authorization);

  tool(
    "get_trello_card",
    "read",
    "Reads a card and recent activity from the Pinelab Trello Board. Use get_pinelab_trello_kanban for more information.",
    {
      ...cardInput,
      before: id.optional(),
      limit: z.number().int().min(1).max(100).default(50),
    },
    async (args) => {
      const existing = await card(args.card);
      const activity = await api(
        `/cards/${existing.id}/actions?limit=${args.limit}${args.before ? `&before=${args.before}` : ""}`,
      );
      return {
        card: existing,
        activity,
        nextBefore: activity.length === args.limit ? activity.at(-1)?.id : null,
      };
    },
  );
  tool(
    "list_trello_cards",
    "read",
    "Lists open cards on the Pinelab Trello Board, optionally by list. Use get_pinelab_trello_kanban for more information.",
    { list: name.optional() },
    async (args) => {
      const boardLists = await lists();
      const destination =
        args.list === undefined
          ? undefined
          : resolve(boardLists, args.list, "list");
      const path = destination
        ? `/lists/${encodeURIComponent(destination.id)}/cards`
        : `/boards/${encodeURIComponent(config.board)}/cards`;
      const cards = await api(
        `${path}?filter=open&fields=name,desc,idBoard,idList,idLabels,idMembers,due,url&members=true&member_fields=fullName,username`,
      );
      return { lists: boardLists, cards };
    },
  );
  tool(
    "add_trello_card_comment",
    "write",
    "Adds a comment to a card on the Pinelab Trello Board. Use get_pinelab_trello_kanban for more information.",
    {
      ...cardInput,
      text: z.string().trim().min(1).max(16000).describe("Comment text to add."),
    },
    async (args) => {
      const existing = await card(args.card);
      return api(`/cards/${existing.id}/actions/comments`, "POST", {
        text: args.text,
      });
    },
  );
  tool(
    "update_trello_card",
    "write",
    "Updates a card on the Pinelab Trello Board. Use get_pinelab_trello_kanban for more information.",
    {
      ...cardInput,
      title: name.optional().describe("New title; omitted preserves the current title."),
      description: z.string().max(16000).optional().describe("New description; omitted preserves it, empty string clears it."),
      list: name.optional().describe("Exact existing list name from get_trello_board; omitted preserves the current list."),
      labels: z.array(name).max(100).optional().describe("Exact existing label names. Replaces all labels; [] clears them; omitted preserves them."),
      assignees: z.array(name).max(100).optional().describe("Exact board-member usernames from get_trello_board. Replaces all assignees; [] clears them; omitted preserves them."),
      position: pos.optional().describe("New position; omitted preserves current positioning."),
    },
    async (args) => {
      const existing = await card(args.card);
      const boardLists = await lists();
      const currentList = boardLists.find((list: { id: string; name: string }) => list.id === existing.idList);
      if (!currentList) throw new Error("Cannot verify the card's current list; update refused.");
      if (currentList.name === "✨Done") {
        throw new Error("Cards in ✨Done are read-only and cannot be updated or moved.");
      }
      // Build a patch from changed fields only: omitted inputs must preserve existing data.
      const body: Record<string, string | number | string[]> = {};
      const changes: string[] = [];
      if (args.title !== undefined && args.title !== existing.name) {
        body.name = args.title;
        changes.push("updated the title");
      }
      if (
        args.description !== undefined &&
        args.description !== existing.desc
      ) {
        body.desc = args.description;
        changes.push("updated the description");
      }
      const destination = args.list === undefined ? undefined : resolve(boardLists, args.list, "list");
      if (destination && destination.id !== existing.idList) {
        body.idList = destination.id;
        changes.push(`moved this card to ${destination.name}`);
      }
      if (args.position !== undefined && args.position !== existing.pos) {
        body.pos = args.position;
        changes.push(destination ? `updated the position in ${destination.name}` : "updated the position");
      }
      if (args.labels !== undefined) {
        const available = args.labels.length ? await labels() : [];
        const selected = [...new Set<string>(args.labels)].map((label) => resolve(available, label, "label"));
        const ids = selected.map((label) => label.id);
        if (ids.length !== existing.idLabels.length || ids.some((value) => !existing.idLabels.includes(value))) {
          body.idLabels = ids.length ? ids : "";
          changes.push(ids.length ? `replaced labels with ${selected.map((label) => label.name).join(", ")}` : "cleared labels");
        }
      }
      if (args.assignees !== undefined) {
        const available = args.assignees.length ? await members() : [];
        const selected = [...new Set<string>(args.assignees)].map((username) => resolve(available, username, "assignee", "username"));
        const ids = selected.map((member) => member.id);
        if (ids.length !== existing.idMembers.length || ids.some((value) => !existing.idMembers.includes(value))) {
          body.idMembers = ids.length ? ids : "";
          changes.push(ids.length ? `replaced assignees with ${selected.map((member) => member.username).join(", ")}` : "cleared assignees");
        }
      }
      if (!changes.length) return { card: existing, changed: false };
      const updated = await api(`/cards/${existing.id}`, "PUT", body);
      await comment(existing.id, changes);
      return updated;
    },
  );
  tool(
    "create_trello_card",
    "write",
    "Creates a card on the Pinelab Trello Board. Use get_pinelab_trello_kanban for more information.",
    {
      title: name,
      description: z.string().max(16000),
      list: name.default("Todo"),
      labels: z.array(name).max(100).default([]).describe("Exact existing label names from get_trello_board; omitted or [] means no labels."),
      assignees: z.array(name).max(100).optional().describe("Exact board-member usernames from get_trello_board; omitted or [] means unassigned."),
      position: pos.default("top"),
    },
    async (args) => {
      const destination = resolve(await lists(), args.list, "list");
      const available = await labels();
      const selected = [...new Set<string>(args.labels)].map((label) =>
        resolve(available, label, "label"),
      );
      const availableMembers = args.assignees?.length ? await members() : [];
      const assigned = [...new Set<string>(args.assignees ?? [])].map((username) =>
        resolve(availableMembers, username, "assignee", "username"),
      );
      // Labels are guidance, not creation prerequisites; never invent or auto-apply a label.
      const warnings = [];
      for (const [color, category] of [
        ["blue_dark", "type"],
        ["green", "client"],
      ]) {
        if (!selected.some((label) => label.color === color))
          warnings.push(
            `No ${category} label selected. Available: ${
              available
                .filter((label) => label.color === color)
                .map((label) => label.name)
                .join(", ") || "none"
            }`,
          );
      }
      const created = await api("/cards", "POST", {
        name: args.title,
        desc: args.description,
        idList: destination.id,
        idLabels: selected.map((label) => label.id),
        ...(args.assignees === undefined ? {} : { idMembers: assigned.map((member) => member.id) }),
        pos: args.position,
      });
      await comment(created.id, [`created this card in ${destination.name}`]);
      return { card: created, warnings };
    },
  );
  tool(
    "get_trello_board",
    "read",
    "Reads the Pinelab Trello Board, lists, labels and members. Use get_pinelab_trello_kanban for more information.",
    {},
    async () => ({
      board: await board(),
      lists: await lists(),
      labels: await labels(),
      members: await members(),
    }),
  );
}
