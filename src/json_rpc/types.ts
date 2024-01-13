import { is, u } from "../deps/unknownutil.ts";

export type VERSION = "2.0";
export const VERSION: VERSION = "2.0";

function isInteger(x: unknown): x is number {
  return Number.isInteger(x);
}

export const isID = is.OneOf([is.String, isInteger, is.Null]);
export type ID = u.PredicateType<typeof isID>;

// Request

export const isRequest = is.ObjectOf({
  jsonrpc: is.LiteralOf(VERSION),
  method: is.String,
  params: is.OptionalOf(is.Unknown),
  id: isID,
}, { strict: true });
export type Request = u.PredicateType<typeof isRequest>;

export const isNotify = is.ObjectOf({
  jsonrpc: is.LiteralOf(VERSION),
  method: is.String,
  params: is.OptionalOf(is.Unknown),
}, { strict: true });
export type Notify = u.PredicateType<typeof isNotify>;

export type RequestLoose = Request | Notify;
export const isRequestLoose = is.ObjectOf({
  jsonrpc: is.LiteralOf(VERSION),
  method: is.String,
  params: is.OptionalOf(is.Unknown),
  id: is.OptionalOf(isID),
}, { strict: true });

// Response

export const isSuccessResponse = is.ObjectOf({
  jsonrpc: is.LiteralOf(VERSION),
  result: <T>(x: T | undefined): x is T => x !== undefined,
  id: isID,
}, { strict: true });
export type SuccessResponse = u.PredicateType<typeof isSuccessResponse>;

export const ErrorCode = {
  "Parse error": -32700,
  "Invalid Request": -32600,
  "Method not found": -32601,
  "Invalid params": -32602,
  "Internal error": -32603,
} as const;
export const isErrorCode = isInteger;
export type ErrorCode = number;

export const isError = is.ObjectOf({
  code: isErrorCode,
  message: is.String,
  data: is.OptionalOf(is.Unknown),
}, { strict: true });
export type Error = u.PredicateType<typeof isError>;

export const isErrorResponse = is.ObjectOf({
  jsonrpc: is.LiteralOf(VERSION),
  error: isError,
  id: isID,
}, { strict: true });
export type ErrorResponse = u.PredicateType<typeof isErrorResponse>;

export const isResponse = is.OneOf([
  isSuccessResponse,
  isErrorResponse,
]);
export type Response = u.PredicateType<typeof isResponse>;
