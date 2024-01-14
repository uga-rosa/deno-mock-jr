import { LspDecoderStream, LspEncoderStream } from "./lsp_stream.ts";
import { assert } from "./deps/std.ts";

const Encoder = new TextEncoder();
function lspEncode(content: string): string {
  const contentBytes = Encoder.encode(content);
  const header = `Content-Length: ${contentBytes.byteLength}`;
  return `${header}\r\n\r\n${content}`;
}

Deno.test({
  name: "lsp_stream",
  fn: async () => {
    const content1 = `{"foo":"bar"}`;
    const lsp1 = lspEncode(content1);
    const content2 = `{"baz":[1,2,3]}`;
    const lsp2 = lspEncode(content2);

    await ReadableStream.from([lsp1, lsp2])
      .pipeThrough(new TextEncoderStream())
      .pipeThrough(new LspDecoderStream())
      .pipeThrough(
        new TransformStream({
          transform: (chunk, controller) => {
            if (chunk !== content1 && chunk !== content2) {
              assert(false);
            }
            controller.enqueue(chunk);
          },
        }),
      )
      .pipeThrough(new LspEncoderStream())
      .pipeThrough(new TextDecoderStream())
      .pipeTo(
        new WritableStream({
          write: (chunk) => {
            if (chunk !== lsp1 && chunk !== lsp2) {
              assert(false);
            }
          },
        }),
      );
  },
});
