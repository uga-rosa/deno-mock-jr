import { LspDecoderStream, LspEncoderStream } from "./lsp_stream.ts";
import { assertEquals } from "./deps/std.ts";

Deno.test({
  name: "lsp_stream",
  fn: async () => {
    const header = `Content-Length: 9`;
    const content = `{"foo":1}`;
    const whole = `${header}\r\n\r\n${content}`;

    await ReadableStream.from(whole)
      .pipeThrough(new TextEncoderStream())
      .pipeThrough(new LspDecoderStream())
      .pipeThrough(
        new TransformStream({
          transform: (chunk, controller) => {
            assertEquals(chunk, content);
            controller.enqueue(chunk);
          },
        }),
      )
      .pipeThrough(new LspEncoderStream())
      .pipeThrough(new TextDecoderStream())
      .pipeTo(
        new WritableStream({
          write: (chunk) => {
            assertEquals(chunk, whole);
          },
        }),
      );
  },
});
