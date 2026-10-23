import { createApp } from "./server.js";
import { users } from "./users.js";

/** Load a Node environment binding; errors identify missing names without exposing values. */
function required(name: string): string {
  const value = process.env[name];
  if (!value?.trim())
    throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// Fail before listening: every configured identity needs a distinct, nontrivial bearer token.
const tokens = new Set<string>();
const usernames = new Set<string>();
for (const user of users) {
  const token = required(user.tokenEnv);
  if (token.length < 32 || /\s/.test(token))
    throw new Error(
      `Use at least 32 non-whitespace characters for ${user.tokenEnv}`,
    );
  if (tokens.has(token) || usernames.has(user.username))
    throw new Error("Usernames and bearer tokens must be unique");
  tokens.add(token);
  usernames.add(user.username);
}
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535");
// Bind locally by default. Public Node deployments need an HTTPS reverse proxy.
const host = process.env.HOST ?? "127.0.0.1";
const allowedHosts = (
  process.env.MCP_ALLOWED_HOSTS ?? "localhost,127.0.0.1,[::1]"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (!allowedHosts.length)
  throw new Error("MCP_ALLOWED_HOSTS must not be empty");
const app = createApp({
  board: required("TRELLO_BOARD_ID"),
  key: required("TRELLO_API_KEY"),
  token: required("TRELLO_API_TOKEN"),
  users,
  env: process.env,
  allowedHosts,
});
const server = app.listen(port, host, () =>
  console.log(`Pinelab MCP listening on port ${port}`),
);
server.requestTimeout = 120000;
server.headersTimeout = 15000;
// Allow in-flight requests to drain, but do not block deployment shutdown indefinitely.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
