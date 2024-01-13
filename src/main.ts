import { Server } from "./server.ts";
import { createProcedureMap, isDefinition } from "./definition.ts";
import { LspDecoderStream, LspEncoderStream } from "./lsp_stream.ts";
import { TOML, YAML } from "./deps/std.ts";
import { u } from "./deps/unknownutil.ts";

const server = new Server();

const definitionPaths = Deno.args;
const definitions = await Promise.all(definitionPaths.map(async (path) => {
  const text = await Deno.readTextFile(path);
  let obj;
  if (path.endsWith(".json")) {
    obj = JSON.parse(text);
  } else if (path.endsWith(".toml")) {
    obj = TOML.parse(text);
  } else if (/\.ya?ml$/.test(path)) {
    obj = YAML.parse(text);
  } else {
    throw new Error(`Unknown extension of the path: ${path}`);
  }
  u.assert(obj, isDefinition);
  return obj;
}));

const map = createProcedureMap(...definitions);
server.setProcedureMap(map);

Deno.stdin.readable
  .pipeThrough(new LspDecoderStream())
  .pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        const resp = server.call(chunk);
        if (resp != null) {
          controller.enqueue(resp);
        }
      },
    }),
  ).pipeThrough(new LspEncoderStream())
  .pipeTo(Deno.stdout.writable);
