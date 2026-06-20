// lib/agent/stream.ts
import type { SSEEvent } from '../types';

export function encodeSSE(event: SSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export type SSEStream = {
  readable: ReadableStream<Uint8Array>;
  send: (event: SSEEvent) => void;
  close: () => void;
};

export function makeSSEStream(): SSEStream {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const readable = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  return {
    readable,
    send(event: SSEEvent) {
      controller.enqueue(encoder.encode(encodeSSE(event)));
    },
    close() {
      controller.close();
    },
  };
}
