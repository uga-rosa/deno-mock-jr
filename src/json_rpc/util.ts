import * as JSONRPC from "./types.ts";

const Message = Object.fromEntries(
  Object.entries(JSONRPC.ErrorCode).map(([k, v]) => [v, k]),
);

export function createError(
  code: number,
  message?: string,
  data?: unknown,
): JSONRPC.Error {
  if (message == null) {
    message = Message[code] ?? "";
  }
  return { code, message, data };
}

export function createResponse(
  id: JSONRPC.ID,
  result?: unknown,
  error?: JSONRPC.Error,
): JSONRPC.Response {
  if (result != null && error == null) {
    return { jsonrpc: JSONRPC.VERSION, result, id };
  } else if (result == null && error != null) {
    return { jsonrpc: JSONRPC.VERSION, error, id };
  } else {
    throw new Error("Only one of result and error should be specified.");
  }
}

export function extractID(request: JSONRPC.RequestLoose): JSONRPC.ID {
  if ("id" in request) {
    return request.id;
  }
  return null;
}
