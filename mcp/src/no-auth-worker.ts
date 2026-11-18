import { handleMcpRequest, type WorkerEnv } from "./worker.js";

/** Local evaluation entry point. Ignore all bindings and disable live Trello access. */
export default {
  /** Serve document tools without authentication; no credentials reach the server. */
  fetch(request: Request, _env: WorkerEnv): Promise<Response> {
    return handleMcpRequest(request, {}, true);
  },
};
