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
  const error: JSONRPC.Error = { code, message };
  if (data != null) {
    error.data = data;
  }
  return error;
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

export function createRequest(
  id: JSONRPC.ID,
  method: string,
  params?: unknown,
): JSONRPC.Request {
  const req: JSONRPC.Request = {
    jsonrpc: JSONRPC.VERSION,
    method,
    id,
  };
  if (params != null) {
    req.params = params;
  }
  return req;
}

export function createNotify(
  method: string,
  params?: unknown,
): JSONRPC.Notify {
  const req: JSONRPC.Notify = {
    jsonrpc: JSONRPC.VERSION,
    method,
  };
  if (params != null) {
    req.params = params;
  }
  return req;
}
