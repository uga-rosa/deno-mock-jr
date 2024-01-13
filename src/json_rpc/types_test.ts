import * as JSONRPC from "./types.ts";
import { is, u } from "../deps/unknownutil.ts";
import { assertEquals } from "../deps/std.ts";

type Spec<T = unknown> = {
  name: string;
  pred: u.Predicate<T>;
  x: T | T[];
  expr: boolean;
};

const Specs: Spec[] = [
  {
    name: "isID (true)",
    pred: JSONRPC.isID,
    x: [1, "x", null],
    expr: true,
  },
  {
    name: "isID (false)",
    pred: JSONRPC.isID,
    x: [undefined, {}, []],
    expr: false,
  },
  {
    name: "isRequest (true)",
    pred: JSONRPC.isRequest,
    x: [
      { jsonrpc: "2.0", method: "foo", params: [1, 2, 3], id: 1 },
      { jsonrpc: "2.0", method: "foo", id: 1 },
    ],
    expr: true,
  },
  {
    name: "isRequest (false)",
    pred: JSONRPC.isRequest,
    x: [
      { jsonrpc: "2.0", method: "foo", params: ["a", "b", 1], id: "a", x: "x" },
      { jsonrpc: "2.0", method: "foo", id: 1, n: 1 },
      { jsonrpc: "1.0", method: "foo", id: 1 },
    ],
    expr: false,
  },
  {
    name: "isNotify (true)",
    pred: JSONRPC.isNotify,
    x: [
      { jsonrpc: "2.0", method: "foo", params: [1, 2, 3] },
      { jsonrpc: "2.0", method: "foo" },
    ],
    expr: true,
  },
  {
    name: "isNotify (false)",
    pred: JSONRPC.isNotify,
    x: [
      { jsonrpc: "2.0", method: "foo", params: [1, 2, 3], x: "x" },
      { jsonrpc: "2.0", method: "foo", n: 1 },
      { jsonrpc: "1.0", method: "foo" },
    ],
    expr: false,
  },
  {
    name: "isRequestLoose (true)",
    pred: JSONRPC.isRequestLoose,
    x: [
      { jsonrpc: "2.0", method: "foo", params: [1, 2, 3], id: 1 },
      { jsonrpc: "2.0", method: "foo", id: 1 },
      { jsonrpc: "2.0", method: "foo", params: [1, 2, 3] },
      { jsonrpc: "2.0", method: "foo" },
    ],
    expr: true,
  },
  {
    name: "isRequestLoose (false)",
    pred: JSONRPC.isRequestLoose,
    x: [
      { jsonrpc: "2.0", method: "foo", params: ["a", "b", 1], id: "a", x: "x" },
      { jsonrpc: "2.0", method: "foo", id: 1, n: 1 },
      { jsonrpc: "1.0", method: "foo", id: 1 },
      { jsonrpc: "2.0", method: "foo", params: [1, 2, 3], x: "x" },
      { jsonrpc: "2.0", method: "foo", n: 1 },
      { jsonrpc: "1.0", method: "foo" },
    ],
    expr: false,
  },
  {
    name: "isSuccessResponse (true)",
    pred: JSONRPC.isSuccessResponse,
    x: [
      { jsonrpc: "2.0", result: 42, id: 1 },
    ],
    expr: true,
  },
  {
    name: "isSuccessResponse (false)",
    pred: JSONRPC.isSuccessResponse,
    x: [
      { jsonrpc: "2.0", result: 42, id: 1, x: "x" },
      { jsonrpc: "2.0", id: 1 },
      { jsonrpc: "1.0", result: 42, id: 1 },
    ],
    expr: false,
  },
  {
    name: "isErrorCode (true)",
    pred: JSONRPC.isErrorCode,
    x: [-32700, 0, 404],
    expr: true,
  },
  {
    name: "isErrorCode (false)",
    pred: JSONRPC.isErrorCode,
    x: [-1.23, 4.5, "x"],
    expr: false,
  },
  {
    name: "isError (true)",
    pred: JSONRPC.isError,
    x: [
      { code: -32600, message: "Invalid Request" },
      { code: -32700, message: "Parse error", data: '{"foo":' },
    ],
    expr: true,
  },
  {
    name: "isError (false)",
    pred: JSONRPC.isError,
    x: [
      { code: -32600, message: "Invalid Request", x: "x" },
      { code: -32600 },
      { message: "" },
    ],
    expr: false,
  },
  {
    name: "isErrorResponse (true)",
    pred: JSONRPC.isErrorResponse,
    x: [
      { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: 1 },
    ],
    expr: true,
  },
  {
    name: "isErrorResponse (false)",
    pred: JSONRPC.isErrorResponse,
    x: [
      { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: 1, x: "x" },
      { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" } },
      { jsonrpc: "2.0", error: { code: -32600 }, id: 1 },
      { jsonrpc: "1.0", error: { code: -32600, message: "Invalid Request" }, id: 1 },
    ],
    expr: false,
  },
  {
    name: "isResponse (true)",
    pred: JSONRPC.isResponse,
    x: [
      { jsonrpc: "2.0", result: 42, id: 1 },
      { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: 1 },
    ],
    expr: true,
  },
  {
    name: "isResponse (false)",
    pred: JSONRPC.isResponse,
    x: [
      { jsonrpc: "2.0", result: 42, id: 1, x: "x" },
      { jsonrpc: "2.0", id: 1 },
      { jsonrpc: "1.0", result: 42, id: 1 },
      { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: 1, x: "x" },
      { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" } },
      { jsonrpc: "2.0", error: { code: -32600 }, id: 1 },
      { jsonrpc: "1.0", error: { code: -32600, message: "Invalid Request" }, id: 1 },
    ],
    expr: false,
  },
];

function toArray<T>(x: T | T[]): T[] {
  return is.Array(x) ? x : [x];
}

Deno.test({
  name: "Test for types predicate",
  fn: async (t) => {
    for (const spec of Specs) {
      await t.step({
        name: spec.name,
        fn: () => {
          for (const x of toArray(spec.x)) {
            assertEquals(spec.pred(x), spec.expr);
          }
        },
      });
    }
  },
});
