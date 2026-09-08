import { describe, expect, test } from 'vitest';

import { DialogueChangeStream } from './dialogue-scenario.js';

describe('Dialogue SSE parser', () => {
  test('preserves a UTF-8 code point fragmented across transport chunks', async () => {
    const encoded = new TextEncoder().encode(
      'event: next\ndata: {"data":{"dialogueChanges":{"cursor":"c","dialogueId":"d","kind":"HISTORY_TEXT_APPENDED","itemId":"i","itemVersion":"1","baseItemVersion":"0","textDelta":"🙂","item":null}}}\n\n',
    );
    const emojiStart = encoded.findIndex((value) => value === 0xf0);
    expect(emojiStart).toBeGreaterThan(0);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded.slice(0, emojiStart + 1));
        controller.enqueue(encoded.slice(emojiStart + 1, emojiStart + 3));
        controller.enqueue(encoded.slice(emojiStart + 3));
        controller.close();
      },
    });
    const subscription = new DialogueChangeStream(stream.getReader(), new AbortController());

    await expect(subscription.next()).resolves.toMatchObject({ textDelta: '🙂' });
  });
});
