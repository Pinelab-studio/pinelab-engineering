import worker, { type WorkerEnv } from "../src/worker.js";

// Test-only external HTTP boundary. Production code never accepts an API URL binding.
const realFetch = globalThis.fetch.bind(globalThis);
let mockOrigin: string;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin !== "https://api.trello.com")
    throw new Error("Unexpected outbound request in MCP test");
  const mock = new URL(mockOrigin);
  url.protocol = mock.protocol;
  url.host = mock.host;
  return realFetch(url, init);
}) as typeof fetch;

export default {
  fetch(request: Request, env: WorkerEnv) {
    mockOrigin = env.TEST_TRELLO_ORIGIN!;
    return worker.fetch(request, env);
  },
};
