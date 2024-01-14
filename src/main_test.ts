import { path } from "./deps/std.ts";
import { assertEquals } from "./deps/std.ts";
import { LspDecoderStream, LspEncoderStream } from "./lsp_stream.ts";

type Spec = {
  name: string;
  request: unknown;
  response: unknown;
};

const Specs: Spec[] = [
  {
    name: "single",
    request: {
      jsonrpc: "2.0",
      method: "add",
      params: [1, 2],
      id: 1,
    },
    response: {
      jsonrpc: "2.0",
      result: 3,
      id: 1,
    },
  },
  {
    name: "multi",
    request: [{
      jsonrpc: "2.0",
      method: "add",
      params: [1, 2],
      id: 1,
    }, {
      jsonrpc: "2.0",
      method: "add",
      params: [3, 4, 5],
      id: 2,
    }],
    response: [{
      jsonrpc: "2.0",
      result: 3,
      id: 1,
    }, {
      jsonrpc: "2.0",
      result: 12,
      id: 2,
    }],
  },
];

async function pass(
  process: Deno.ChildProcess,
  request: unknown,
  response: unknown,
): Promise<void> {
  await ReadableStream.from(JSON.stringify(request))
    .pipeThrough(new LspEncoderStream())
    .pipeTo(process.stdin);
  await process.stdout
    .pipeThrough(new LspDecoderStream())
    .pipeTo(
      new WritableStream({
        write: (chunk) => {
          assertEquals(chunk, JSON.stringify(response));
        },
      }),
    );
}

Deno.test({
  name: "test for mock-langserver",
  fn: async (t) => {
    const root = new URL("../", import.meta.url).pathname;

    const process = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--allow-read",
        path.join(root, "src", "main.ts"),
        path.join(root, "test", "math.yaml"),
      ],
      stdin: "piped",
      stdout: "piped",
    }).spawn();

    for (const spec of Specs) {
      await t.step({
        name: spec.name,
        fn: async () => {
          await pass(process, spec.request, spec.response);
        },
      });
    }
  },
});
