import { createProcedureMap, isDefinition } from "./definition.ts";
import { assert, assertEquals } from "./deps/std.ts";

const request = {
  add: [
    { params: [1, 2], result: 3 },
    { params: [3, 4], result: 7 },
  ],
};

const request2 = {
  subtract: [
    { params: [4, 1], result: 3 },
    { params: [6, 4], result: 2 },
  ],
};

const notify = [
  "update",
  "notify_hello",
];

Deno.test({
  name: "isDefinition",
  fn: async (t) => {
    await t.step({
      name: "only request",
      fn: () => {
        assertEquals(isDefinition({ request }), true);
      },
    });
    await t.step({
      name: "only notify",
      fn: () => {
        assertEquals(isDefinition({ notify }), true);
      },
    });
    await t.step({
      name: "request and notify",
      fn: () => {
        assertEquals(isDefinition({ request, notify }), true);
      },
    });
    await t.step({
      name: "extra field",
      fn: () => {
        assertEquals(isDefinition({ request, notify, x: "x" }), false);
      },
    });
  },
});

Deno.test({
  name: "createProcedureMap",
  fn: async (t) => {
    await t.step({
      name: "single definition",
      fn: () => {
        const map = createProcedureMap({ request, notify });
        const add = map.get("add");
        assert(add);
        assertEquals(add(request.add[0].params), request.add[0].result);
        assertEquals(add(request.add[1].params), request.add[1].result);
      },
    });
    await t.step({
      name: "multi definition",
      fn: () => {
        const map = createProcedureMap({ request, notify }, { request: request2 });
        const add = map.get("add");
        assert(add);
        assertEquals(add(request.add[0].params), request.add[0].result);
        assertEquals(add(request.add[1].params), request.add[1].result);
        const subtract = map.get("subtract");
        assert(subtract);
        assertEquals(subtract(request2.subtract[0].params), request2.subtract[0].result);
        assertEquals(subtract(request2.subtract[1].params), request2.subtract[1].result);
      },
    });
    await t.step({
      name: "notify return undefined",
      fn: () => {
        const map = createProcedureMap({ request, notify });
        const update = map.get("update");
        assert(update);
        assertEquals(update(), undefined);
      },
    });
  },
});
