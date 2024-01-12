import { equal } from "./deps/std.ts";
import { is, u } from "./deps/unknownutil.ts";
import { ProcedureMap } from "./server.ts";

function isRecordOfString<T>(pred: u.Predicate<T>) {
  return (x: unknown): x is Record<string, T> => {
    if (!u.isRecord(x)) return false;
    for (const k in x) {
      if (is.String(k) && !pred(x[k])) return false;
    }
    return true;
  };
}

export const isDefinition = is.ObjectOf({
  request: is.OptionalOf(isRecordOfString(
    is.ArrayOf(
      is.ObjectOf({
        params: is.Unknown,
        result: is.Unknown,
      }),
    ),
  )),
  notify: is.OptionalOf(is.ArrayOf(is.String)),
});

export type Definition = u.PredicateType<typeof isDefinition>;

export function createProcedureMap(...definitions: Definition[]): ProcedureMap {
  const map: ProcedureMap = new Map();
  for (const definition of definitions) {
    for (const [method, defs] of Object.entries(definition.request ?? {})) {
      map.set(method, (params: unknown) => defs.find((def) => equal(params, def.params))?.result);
    }
    for (const method of definition.notify ?? []) {
      if (map.has(method)) {
        throw new Error(`Duplicate method name: ${method}`);
      }
      map.set(method, () => {});
    }
  }
  return map;
}
