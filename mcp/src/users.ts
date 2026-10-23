/** File-based application identity, independent of the shared Trello integration account. */
export type User = {
  /** Display name used in mutation comments; never accepted from tool arguments. */
  username: string;
  /** Name of an environment variable or Cloudflare secret, not the secret value itself. */
  tokenEnv: string;
  /** Tool permissions; write-only users may still perform internal safety lookups. */
  permissions: readonly ("read" | "write")[];
};

/**
 * Allowed users. Add identities here, provision each tokenEnv secret separately, then redeploy.
 * Never commit token values. Rotate secrets in the environment/Cloudflare, not in this file.
 */
export const users: readonly User[] = [
  {
    username: "martijn",
    tokenEnv: "MARTIJN_MCP_TOKEN",
    permissions: ["read", "write"],
  },
];
