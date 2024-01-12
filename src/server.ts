import * as JSONRPC from "./json_rpc/types.ts";
import { createError, createResponse, extractID } from "./json_rpc/util.ts";
import { is } from "./deps/unknownutil.ts";

export type ProcedureMap = Map<string, (params?: unknown) => unknown>;

export default class Server {
  #procedureMap: ProcedureMap = new Map();

  constructor() {}

  setProcedureMap(procedure: ProcedureMap) {
    this.#procedureMap = procedure;
  }

  call(encoded: string): string {
    let request;
    try {
      request = JSON.parse(encoded);
    } catch {
      const error = createError(JSONRPC.ErrorCode["Parse error"]);
      return JSON.stringify(createResponse(null, null, error));
    }
    if (is.Array(request)) {
      const responses = this.callBatch(request);
      if (responses.length > 0) {
        return JSON.stringify(responses);
      }
      return "";
    } else {
      return JSON.stringify(this.callFlow(request) ?? "");
    }
  }

  callFlow(request: unknown): JSONRPC.Response | undefined {
    if (!JSONRPC.isRequestLoose(request)) {
      const error = createError(JSONRPC.ErrorCode["Invalid Request"]);
      return createResponse(null, null, error);
    }

    const procedure = this.#procedureMap.get(request.method);
    if (procedure == null) {
      const error = createError(JSONRPC.ErrorCode["Method not found"]);
      return createResponse(extractID(request), null, error);
    }

    const result = procedure(request.params);
    if ("id" in request && request.id !== undefined) {
      return createResponse(request.id, result);
    }
  }

  callBatch(requests: unknown[]): JSONRPC.Response[] {
    return requests.map((request) => this.callFlow(request)).filter(isDefined);
  }
}

function isDefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}
