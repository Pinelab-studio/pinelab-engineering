export type User = {
  username: string;
  tokenEnv: string;
  permissions: readonly ("read" | "write")[];
};

// Set a different high-entropy environment-variable token for each user.
// Never commit token values here. Permissions govern tools, not internal safety lookups.
export const users: readonly User[] = [
  {
    username: "martijn",
    tokenEnv: "MARTIJN_MCP_TOKEN",
    permissions: ["read", "write"],
  },
];
