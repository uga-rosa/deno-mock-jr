import { Server } from "./server.ts";
import { createProcedureMap } from "./definition.ts";
import { createError, createResponse } from "./json_rpc/util.ts";
import { ErrorCode } from "./json_rpc/types.ts";
import { assertEquals } from "./deps/std.ts";

const definition = {
  request: {
    add: [
      { params: [1, 2], result: 3 },
      { params: [3, 4], result: 7 },
    ],
    subtract: [
      { params: [4, 1], result: 3 },
      { params: [6, 4], result: 2 },
    ],
  },
  notify: [
    "update",
    "notify_hello",
  ],
};

const server = new Server();
const map = createProcedureMap(definition);
const errMsg = "Raise error";
map.set("raise", () => {
  throw "Raise error";
});
server.setProcedureMap(map);

Deno.test({
  name: "callFlow",
  fn: async (t) => {
    for (const [method, defs] of Object.entries(definition.request)) {
      for (const def of defs) {
        await t.step({
          name: `request: ${method}`,
          fn: () => {
            const resp = server.callFlow({ jsonrpc: "2.0", method, params: def.params, id: 1 });
            assertEquals(resp, createResponse(1, def.result));
          },
        });
      }
    }
    for (const method of definition.notify) {
      await t.step({
        name: `notify: ${method}`,
        fn: () => {
          const resp = server.callFlow({ jsonrpc: "2.0", method });
          assertEquals(resp, undefined);
        },
      });
    }
    await t.step({
      name: "Invalid Request",
      fn: () => {
        const error = server.callFlow({ foo: "bar" });
        assertEquals(
          error,
          createResponse(null, null, createError(ErrorCode["Invalid Request"])),
        );
      },
    });
    await t.step({
      name: "Method not found",
      fn: () => {
        const error = server.callFlow({ jsonrpc: "2.0", method: "foo", id: 1 });
        assertEquals(
          error,
          createResponse(1, null, createError(ErrorCode["Method not found"])),
        );
      },
    });
    await t.step({
      name: "Invalid params",
      fn: () => {
        const error = server.callFlow({ jsonrpc: "2.0", method: "add", params: [1, 2, 3], id: 1 });
        assertEquals(
          error,
          createResponse(1, null, createError(ErrorCode["Invalid params"])),
        );
      },
    });
    await t.step({
      name: "Internal error",
      fn: () => {
        const error = server.callFlow({ jsonrpc: "2.0", method: "raise", id: 1 });
        assertEquals(
          error,
          createResponse(1, null, createError(ErrorCode["Internal error"], errMsg)),
        );
      },
    });
  },
});

Deno.test({
  name: "callBatch",
  fn: async (t) => {
    await t.step({
      name: "multi requests",
      fn: () => {
        const resp = server.callBatch([
          { jsonrpc: "2.0", method: "add", params: definition.request.add[0].params, id: 0 },
          { jsonrpc: "2.0", method: "add", params: definition.request.add[1].params, id: 1 },
        ]);
        assertEquals(resp, [
          createResponse(0, definition.request.add[0].result),
          createResponse(1, definition.request.add[1].result),
        ]);
      },
    });
    await t.step({
      name: "multi requests and notify",
      fn: () => {
        const resp = server.callBatch([
          { jsonrpc: "2.0", method: "subtract", params: definition.request.subtract[0].params, id: 0 },
          { jsonrpc: "2.0", method: "update" },
          { jsonrpc: "2.0", method: "subtract", params: definition.request.subtract[1].params, id: 1 },
        ]);
        assertEquals(resp, [
          createResponse(0, definition.request.subtract[0].result),
          createResponse(1, definition.request.subtract[1].result),
        ]);
      },
    });
    await t.step({
      name: "include invalid request",
      fn: () => {
        const resp = server.callBatch([
          { jsonrpc: "2.0", method: "subtract", params: [], id: 0 },
          { jsonrpc: "2.0", method: "update" },
          { jsonrpc: "2.0", method: "subtract", params: definition.request.subtract[1].params, id: 1 },
        ]);
        assertEquals(resp, [
          createResponse(0, null, createError(ErrorCode["Invalid params"])),
          createResponse(1, definition.request.subtract[1].result),
        ]);
      },
    });
  },
});

Deno.test({
  name: "call",
  fn: async (t) => {
    await t.step({
      name: "single request",
      fn: () => {
        const resp = server.call(JSON.stringify({
          jsonrpc: "2.0",
          method: "add",
          params: definition.request.add[0].params,
          id: 1,
        }));
        assertEquals(
          resp,
          JSON.stringify(createResponse(1, definition.request.add[0].result)),
        );
      },
    });
    await t.step({
      name: "invalid json",
      fn: () => {
        const resp = server.call(`{"foo":`);
        assertEquals(
          resp,
          JSON.stringify(createResponse(null, null, createError(ErrorCode["Parse error"]))),
        );
      },
    });
    await t.step({
      name: "batch request",
      fn: () => {
        const resp = server.call(JSON.stringify([{
          jsonrpc: "2.0",
          method: "add",
          params: definition.request.add[0].params,
          id: 0,
        }, {
          jsonrpc: "2.0",
          method: "add",
          params: definition.request.add[1].params,
          id: 1,
        }]));
        assertEquals(
          resp,
          JSON.stringify([
            createResponse(0, definition.request.add[0].result),
            createResponse(1, definition.request.add[1].result),
          ]),
        );
      },
    });
    await t.step({
      name: "notify",
      fn: () => {
        const resp = server.call(JSON.stringify({ jsonrpc: "2.0", method: "update" }));
        assertEquals(resp, undefined);
      },
    });
  },
});
