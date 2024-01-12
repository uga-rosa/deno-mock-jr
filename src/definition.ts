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

const isPattern = is.ObjectOf({
  params: is.Unknown,
  result: is.Unknown,
});
type Pattern = u.PredicateType<typeof isPattern>;

export const isDefinition = is.ObjectOf({
  request: is.OptionalOf(isRecordOfString(is.ArrayOf(isPattern))),
  notify: is.OptionalOf(is.ArrayOf(is.String)),
});

export type Definition = u.PredicateType<typeof isDefinition>;

export function createProcedureMap(...definitions: Definition[]): ProcedureMap {
  const patternMap = new Map<string, Pattern[]>();
  for (const definition of definitions) {
    for (const [method, defs] of Object.entries(definition.request ?? {})) {
      const patterns = patternMap.get(method) ?? [];
      patterns.push(...defs);
      patternMap.set(method, patterns);
    }

    for (const method of definition.notify ?? []) {
      const patterns = patternMap.get(method) ?? [];
      patternMap.set(method, patterns);
    }
  }
  const map: ProcedureMap = new Map();
  for (const [method, patterns] of patternMap) {
    map.set(method, (params) => {
      const def = patterns.find((def) => equal(params, def.params));
      return def?.result;
    });
  }
  return map;
}
