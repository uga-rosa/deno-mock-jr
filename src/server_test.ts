import { Server } from "./server.ts";
import { createProcedureMap } from "./definition.ts";
import { createError, createNotify, createRequest, createResponse } from "./json_rpc/util.ts";
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
            const request = createRequest(1, method, def.params);
            const resp = server.callFlow(request);
            assertEquals(resp, createResponse(1, def.result));
          },
        });
      }
    }
    for (const method of definition.notify) {
      await t.step({
        name: `notify: ${method}`,
        fn: () => {
          const notify = createNotify(method);
          const resp = server.callFlow(notify);
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
        const request = createRequest(1, "foo");
        const error = server.callFlow(request);
        assertEquals(
          error,
          createResponse(1, null, createError(ErrorCode["Method not found"])),
        );
      },
    });
    await t.step({
      name: "Invalid params",
      fn: () => {
        const request = createRequest(1, "add", [1, 2, 3]);
        const error = server.callFlow(request);
        assertEquals(
          error,
          createResponse(1, null, createError(ErrorCode["Invalid params"])),
        );
      },
    });
    await t.step({
      name: "Internal error",
      fn: () => {
        const request = createRequest(1, "raise");
        const error = server.callFlow(request);
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
          createRequest(0, "add", definition.request.add[0].params),
          createRequest(1, "add", definition.request.add[1].params),
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
          createRequest(0, "subtract", definition.request.subtract[0].params),
          createNotify("update"),
          createRequest(1, "subtract", definition.request.subtract[1].params),
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
          createRequest(0, "subtract", []),
          createRequest(1, "subtract", definition.request.subtract[1].params),
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
        const request = createRequest(1, "add", definition.request.add[0].params);
        const resp = server.call(JSON.stringify(request));
        assertEquals(
          resp,
          JSON.stringify(createResponse(1, definition.request.add[0].result)),
        );
      },
    });
    await t.step({
      name: "invalid json",
      fn: () => {
        const invalidJson = `{"foo":`;
        const resp = server.call(invalidJson);
        assertEquals(
          resp,
          JSON.stringify(createResponse(
            null,
            null,
            createError(ErrorCode["Parse error"], undefined, invalidJson),
          )),
        );
      },
    });
    await t.step({
      name: "batch request",
      fn: () => {
        const requests = [
          createRequest(0, "add", definition.request.add[0].params),
          createRequest(1, "add", definition.request.add[1].params),
        ];
        const resp = server.call(JSON.stringify(requests));
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
        const notify = createNotify("update");
        const resp = server.call(JSON.stringify(notify));
        assertEquals(resp, undefined);
      },
    });
  },
});
