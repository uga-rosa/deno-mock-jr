import { bytes } from "./deps/std.ts";

// \r\n
const term = new Uint8Array([0x0d, 0x0a]);
const separator = bytes.concat([term, term]);

type Header = {
  length?: number;
  type?: string; // Ignore
};

const Mode = {
  Header: 0,
  Content: 1,
} as const;
type Mode = typeof Mode[keyof typeof Mode];

export class LspDecoderStream extends TransformStream<Uint8Array, string> {
  #buf = new Uint8Array();
  #header: Header = {};
  #mode: Mode = Mode.Header;
  #decoder = new TextDecoder();

  constructor() {
    super({
      transform: (chunk, controller) => {
        this.#handle(chunk, controller);
      },
    });
  }

  #handle(
    chunk: Uint8Array,
    controller: TransformStreamDefaultController<string>,
  ) {
    this.#buf = bytes.concat([this.#buf, chunk]);

    while (true) {
      if (this.#mode === Mode.Header) {
        const point = bytes.indexOfNeedle(this.#buf, separator);
        if (point === -1) {
          return;
        }
        const header = this.#buf.subarray(0, point);
        this.#setHeader(header);
        this.#buf = this.#buf.subarray(point + 4);
        this.#mode = Mode.Content;
      }

      const contentLength = this.#header.length;
      if (contentLength == null) {
        throw new Error("Content-Length not specified");
      } else if (this.#buf.length < contentLength) {
        return;
      }
      const content = this.#buf.subarray(0, contentLength);
      controller.enqueue(this.#decoder.decode(content));
      this.#buf = this.#buf.subarray(contentLength);
      this.#mode = Mode.Header;
    }
  }

  /*
   * https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#headerPart
   */
  #setHeader(buf: Uint8Array) {
    const str = this.#decoder.decode(buf);
    for (const line of str.split("\r\n")) {
      const length = /^content-length: (\d+)$/i.exec(line);
      if (length?.length === 2) {
        this.#header.length = Number(length[1]);
      }
      const type = /^content-type: (.+)$/i.exec(line);
      if (type?.length === 2) {
        this.#header.type = type[1];
      }
    }
  }
}

export class LspEncoderStream extends TransformStream<string, Uint8Array> {
  #encoder = new TextEncoder();

  constructor() {
    super({
      transform: (chunk, controller) => {
        const content = this.#encoder.encode(chunk);
        const header = `Content-Length: ${content.byteLength}\r\n\r\n`;
        const headerBytes = this.#encoder.encode(header);
        controller.enqueue(bytes.concat([headerBytes, content]));
      },
    });
  }
}
