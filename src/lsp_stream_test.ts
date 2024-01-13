import { LspDecoderStream, LspEncoderStream } from "./lsp_stream.ts";
import { assertEquals } from "./deps/std.ts";

Deno.test({
  name: "lsp_stream",
  fn: async () => {
    const start = `Content-Length: 9\r\n\r\n{"foo":1}`;

    await ReadableStream.from(start)
      .pipeThrough(new TextEncoderStream())
      .pipeThrough(new LspDecoderStream())
      .pipeThrough(
        new TransformStream({
          transform: (chunk, controller) => {
            assertEquals(chunk, `{"foo":1}`);
            controller.enqueue(chunk);
          },
        }),
      )
      .pipeThrough(new LspEncoderStream())
      .pipeThrough(new TextDecoderStream())
      .pipeTo(
        new WritableStream({
          write: (chunk) => {
            assertEquals(chunk, start);
          },
        }),
      );
  },
});
