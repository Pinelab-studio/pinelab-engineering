import { timingSafeEqual } from "node:crypto";
import type { Config } from "./mcp.js";

/** Fail closed on missing, weak, or ambiguous identity bindings. Never expose secrets. */
export function authenticate(config: Pick<Config, "users" | "env">, authorization: string | undefined) {
  const tokens = config.users.map((user) => config.env[user.tokenEnv]);
  if (tokens.some((token) => !token || token.length < 32 || /\s/.test(token)) ||
      new Set(tokens).size !== tokens.length ||
      new Set(config.users.map((user) => user.username)).size !== config.users.length) return undefined;
  const bearer = authorization?.match(/^Bearer (\S+)$/i)?.[1];
  if (!bearer) return undefined;
  return config.users.find((user) => {
    const expected = Buffer.from(config.env[user.tokenEnv]!);
    const actual = Buffer.from(bearer);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
