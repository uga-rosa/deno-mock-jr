import { createError, createResponse, extractID } from "./util.ts";
import { assertEquals, assertThrows } from "../deps/std.ts";

Deno.test({
  name: "createError",
  fn: async (t) => {
    await t.step({
      name: "Only error code",
      fn: () => {
        assertEquals(
          createError(-32700),
          { code: -32700, message: "Parse error" },
        );
      },
    });
    await t.step({
      name: "Set message",
      fn: () => {
        assertEquals(
          createError(-32700, "Custom message"),
          { code: -32700, message: "Custom message" },
        );
      },
    });
    await t.step({
      name: "Set data",
      fn: () => {
        assertEquals(
          createError(-32700, undefined, `{"foo":`),
          { code: -32700, message: "Parse error", data: `{"foo":` },
        );
      },
    });
  },
});

Deno.test({
  name: "createResponse",
  fn: async (t) => {
    await t.step({
      name: "Success",
      fn: () => {
        assertEquals(
          createResponse(1, "foo"),
          { jsonrpc: "2.0", id: 1, result: "foo" },
        );
      },
    });
    await t.step({
      name: "Error",
      fn: () => {
        assertEquals(
          createResponse(null, null, createError(-32700)),
          { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
        );
      },
    });
    await t.step({
      name: "Neither result nor error",
      fn: () => {
        assertThrows(() => {
          createResponse(1);
        });
      },
    });
    await t.step({
      name: "Both result and error",
      fn: () => {
        assertThrows(() => {
          createResponse(1, "foo", createError(-32700));
        });
      },
    });
  },
});

Deno.test({
  name: "extractID",
  fn: async (t) => {
    await t.step({
      name: "request",
      fn: () => {
        assertEquals(extractID({ jsonrpc: "2.0", method: "foo", id: 1 }), 1);
      },
    });
    await t.step({
      name: "notify",
      fn: () => {
        assertEquals(extractID({ jsonrpc: "2.0", method: "foo" }), null);
      },
    });
  },
});
