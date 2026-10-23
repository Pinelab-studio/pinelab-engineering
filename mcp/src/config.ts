import type { Config } from "./mcp.js";
/** Application identity, independent of the shared Trello integration account. */
export type User = {
  /** Display name used in mutation comments, never supplied by tool arguments. */
  username: string;
  /** Secret binding name, not its value. */
  tokenEnv: string;
  permissions: readonly ("read" | "write")[];
};

/** Add identities here and provision their secrets separately. Never commit token values. */
const users: readonly User[] = [
  {
    username: "martijn",
    tokenEnv: "MARTIJN_MCP_TOKEN",
    permissions: ["read", "write"],
  },
];

export type Environment = Record<string, string | undefined>;

let lastMissingVariables: string | undefined;

/** Load Worker bindings. Never log the returned object: it contains credentials. */
export function loadConfig(env: Environment) {
  const missing = [
    "TRELLO_API_KEY", "TRELLO_API_TOKEN", "TRELLO_BOARD_ID",
    ...users.map((user) => user.tokenEnv),
  ].filter((name) => !env[name]?.trim());
  const template = missing.map((name) => `${name}=`).join("\n");
  if (template && template !== lastMissingVariables) {
    console.error(`Missing MCP environment variables. Add these to .dev.vars:\n\n${template}\n`);
  }
  lastMissingVariables = template;

  return {
    board: env.TRELLO_BOARD_ID ?? "",
    key: env.TRELLO_API_KEY ?? "",
    token: env.TRELLO_API_TOKEN ?? "",
    users,
    env: Object.fromEntries(users.map((user) => [user.tokenEnv, env[user.tokenEnv]])),
    apiBase: "https://api.trello.com/1",
  } satisfies Config;
}
