import type { Config } from "./mcp.js";
/** Application identity, independent of the shared Trello integration account. */
export type User = {
  /** Display name used in mutation comments, never supplied by tool arguments. */
  username: string;
  /** Bearer key used to authenticate this identity. */
  token: string;
  permissions: readonly ("read" | "write")[];
};

export type Environment = Record<string, string | undefined>;

/** Load Worker bindings. Never log the returned object: it contains credentials. */
export function loadConfig(env: Environment) {
  const entries = (env.API_KEYS ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const users: User[] = [];
  let invalidApiKeys = false;
  for (const entry of entries) {
    const separator = entry.indexOf(":");
    if (separator <= 0 || separator === entry.length - 1) {
      invalidApiKeys = true;
      continue;
    }
    const username = entry.slice(0, separator).trim();
    const token = entry.slice(separator + 1).trim();
    if (!username || !token || token.length < 32 || /\s/.test(token)) {
      invalidApiKeys = true;
      continue;
    }
    users.push({ username, token, permissions: ["read", "write"] });
  }
  if (new Set(users.map((user) => user.username)).size !== users.length ||
      new Set(users.map((user) => user.token)).size !== users.length) invalidApiKeys = true;

  const missing = [
    "TRELLO_API_KEY", "TRELLO_API_TOKEN", "TRELLO_BOARD_ID",
    ...(entries.length === 0 ? ["API_KEYS"] : []),
  ].filter((name) => !env[name]?.trim());
  const template = missing.map((name) => `${name}=`).join("\n");
  if (template) console.error(`Missing MCP environment variables. Add these to .dev.vars:\n\n${template}\n`);
  else if (invalidApiKeys)
    console.error("Invalid API_KEYS configuration; authentication is disabled.");

  return {
    board: env.TRELLO_BOARD_ID ?? "",
    key: env.TRELLO_API_KEY ?? "",
    token: env.TRELLO_API_TOKEN ?? "",
    users: invalidApiKeys ? [] : users,
    env: {},
    apiBase: "https://api.trello.com/1",
  } satisfies Config;
}
