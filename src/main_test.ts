import { path } from "./deps/std.ts";
import { assertEquals } from "./deps/std.ts";
import { LspDecoderStream, LspEncoderStream } from "./lsp_stream.ts";
import { createRequest, createResponse } from "./json_rpc/util.ts";

const requests = [
  createRequest(0, "add", [1, 2]),
  createRequest(1, "sub", [3, 1]),
  [
    createRequest(2, "add", [3, 4, 5]),
    createRequest(3, "sub", [9, 3]),
  ],
];

const responses = [
  createResponse(0, 3),
  createResponse(1, 2),
  [
    createResponse(2, 12),
    createResponse(3, 6),
  ],
];

Deno.test({
  name: "test for mock-langserver",
  fn: async () => {
    // In Windows, spawn is broken (Deno 1.39.4)
    if (Deno.build.os === "windows") {
      return;
    }

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

    await ReadableStream.from(requests)
      .pipeThrough(
        new TransformStream({
          transform: (chunk, controller) => {
            controller.enqueue(JSON.stringify(chunk));
          },
        }),
      )
      .pipeThrough(new LspEncoderStream())
      .pipeTo(process.stdin);

    let id = 0;
    await process.stdout
      .pipeThrough(new LspDecoderStream())
      .pipeTo(
        new WritableStream({
          write: (chunk) => {
            const resp = JSON.parse(chunk);
            assertEquals(resp, responses[id]);
            id++;
          },
        }),
      );
  },
});
