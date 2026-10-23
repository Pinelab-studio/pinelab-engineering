import { authenticate } from "../auth.js";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../mcp.js";

/** Format tool responses consistently; API failures must be sanitized before reaching here. */
const output = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});
export const id = z
  .string()
  .regex(/^[a-zA-Z0-9]+$/, "Use a Trello ID or short link, not a URL");
export const name = z.string().trim().min(1).max(1000);
export const pos = z.union([
  z.enum(["top", "bottom"]),
  z.number().finite().positive(),
]);
export const cardInput = { card: id };

/**
 * Create request-scoped Trello helpers bound to the authenticated identity.
 * Each invocation checks permissions before any API request.
 * Mutation attribution always uses that identity, never caller-provided tool arguments.
 */
export function createTrelloHelpers(
  server: McpServer,
  config: Config,
  authorization: string | undefined,
) {
  const user = authenticate(config, authorization);

  /** Central permission gate. Internal safety lookups inherit the tool's authorization. */
  function tool(
    toolName: string,
    permission: "read" | "write",
    description: string,
    inputSchema: z.ZodRawShape,
    handler: (args: Record<string, any>) => Promise<unknown>,
  ) {
    server.registerTool(
      toolName,
      {
        description: `Only use when the user explicitly mentions “pinelab” (case-insensitive). ${description}`,
        inputSchema,
        annotations: {
          readOnlyHint: permission === "read",
          destructiveHint: permission === "write",
          idempotentHint: permission === "read",
          openWorldHint: true,
        },
      },
      async (args) => {
        if (!user)
          return {
            ...output("Unauthorized: valid bearer token required"),
            isError: true,
          };
        if (!user.permissions.includes(permission))
          return {
            ...output(`Forbidden: ${permission} permission required`),
            isError: true,
          };
        if (![config.board, config.key, config.token].every((value) => value?.trim()))
          return {
            ...output("Trello configuration is incomplete: configure TRELLO_BOARD_ID, TRELLO_API_KEY, and TRELLO_API_TOKEN"),
            isError: true,
          };
        try {
          return output(await handler(args));
        } catch (error) {
          return {
            ...output(
              error instanceof Error
                ? error.message
                : "Trello operation failed",
            ),
            isError: true,
          };
        }
      },
    );
  }
  /** Redact all configured credentials before logging; never log URLs or request bodies. */
  function redact(text: string) {
    const secrets = [config.key, config.token, ...Object.values(config.env)]
      .filter((value): value is string => !!value)
      .flatMap((value) => [value, encodeURIComponent(value), JSON.stringify(value).slice(1, -1)])
      .sort((a, b) => b.length - a.length);
    for (const secret of secrets) text = text.split(secret).join("[REDACTED]");
    return text.replace(/[\u0000-\u001f\u007f]/g, " ");
  }

  /** Bound error-body reads as well as log size; do not consume an unbounded upstream body. */
  async function errorBody(response: Response) {
    const reader = response.body?.getReader();
    if (!reader) return "";
    const decoder = new TextDecoder();
    let text = "";
    let remaining = 8192;
    try {
      while (remaining > 0) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = value.subarray(0, remaining);
        remaining -= chunk.length;
        text += decoder.decode(chunk, { stream: true });
      }
      return redact(text).slice(0, 1024);
    } catch {
      return "[Unable to read error response]";
    } finally {
      await reader.cancel().catch(() => {});
    }
  }

  /**
   * Make one bounded Trello request, without redirects, retries, or upstream error bodies in tool results.
   * URLs contain credentials: never log them or include raw fetch errors in tool results.
   * Uncertain writes must be inspected by the caller before another attempt.
   */
  async function api(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<any> {
    const url = new URL(
      `${config.apiBase ?? "https://api.trello.com/1"}${path}`,
    );
    url.searchParams.set("key", config.key);
    url.searchParams.set("token", config.token);
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        // Workers supports manual, not error; the status check below rejects redirects.
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      console.error("Trello network error", { method, path: redact(url.pathname), error: "Request failed or timed out" });
      throw new Error(
        "Trello request failed or timed out. For writes, inspect the card before retrying.",
      );
    }
    if (!response.ok) {
      console.error("Trello HTTP error", {
        method,
        path: redact(url.pathname),
        status: response.status,
        response: await errorBody(response),
      });
      throw new Error(
        `Trello returned HTTP ${response.status}. For writes, inspect the card before retrying.`,
      );
    }
    try {
      return await response.json();
    } catch {
      console.error("Trello invalid JSON", { method, path: redact(url.pathname), status: response.status });
      throw new Error(
        "Invalid Trello response; inspect the card before retrying writes.",
      );
    }
  }
  /** Resolve the configured board's full ID, including when configuration uses a short link. */
  async function board() {
    return api(`/boards/${encodeURIComponent(config.board)}?fields=id,name`);
  }
  /** Fetch open lists only from the configured board; callers resolve destinations by name. */
  async function lists() {
    return api(
      `/boards/${encodeURIComponent(config.board)}/lists?filter=open&fields=name`,
    );
  }
  /** Only current board members are eligible assignees. */
  async function members() {
    return api(`/boards/${encodeURIComponent(config.board)}/members?fields=username,fullName`);
  }
  /** Read every label page before deciding that a requested label is missing. */
  async function labels() {
    const all: any[] = [];
    let before = "";
    for (;;) {
      const page = await api(
        `/boards/${encodeURIComponent(config.board)}/labels?fields=name,color&limit=1000${before ? `&before=${encodeURIComponent(before)}` : ""}`,
      );
      all.push(...page);
      if (page.length < 1000) return all;
      const next = page.at(-1).id;
      if (next === before) throw new Error("Unable to paginate Trello labels");
      before = next;
    }
  }
  /** Fetch a card and verify board membership before returning data or allowing mutations. */
  async function card(cardId: string) {
    const resolved = await board();
    const value = await api(
      `/cards/${cardId}?fields=name,desc,idBoard,idList,idLabels,labels,pos,url,idMembers,due`,
    );
    if (value.idBoard !== resolved.id)
      throw new Error("Card is outside the configured board");
    return value;
  }
  /** Require one exact name match; missing or duplicate names must never trigger a guess. */
  function resolve(values: any[], requested: string, kind: string, field = "name") {
    const matches = values.filter((v) => v[field] === requested);
    if (matches.length !== 1)
      throw new Error(
        `Missing or ambiguous ${kind}: ${requested}. Choose an existing, unambiguous ${field}.`,
      );
    return matches[0];
  }
  /** Best-effort attribution after successful changes, not a transactional audit guarantee. */
  async function comment(cardId: string, changes: string[]) {
    if (!changes.length) return;
    // A failed audit comment must not turn a successful mutation into a failed tool result.
    try {
      await api(`/cards/${cardId}/actions/comments`, "POST", {
        text: `${user!.username} ${changes.join("; ")}.`,
      });
    } catch {
      /* best effort */
    }
  }

  return { tool, api, board, lists, labels, members, card, resolve, comment };
}
