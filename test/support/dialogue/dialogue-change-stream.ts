import type { DialogueChange } from './dialogue-scenario.types.js';

/* oxlint-disable no-await-in-loop -- SSE frames are decoded and applied in wire order. */

export class DialogueChangeStream {
  private buffer = '';
  private readonly decoder = new TextDecoder();

  constructor(
    private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
    private readonly controller: AbortController,
  ) {}

  async next(): Promise<DialogueChange> {
    return this.withTimeout(() => this.readNext());
  }

  async nextKind(kind: string): Promise<DialogueChange> {
    return this.withTimeout(async () => {
      while (true) {
        const change = await this.readNext();
        if (change.kind === kind) {
          return change;
        }
      }
    });
  }

  async expectText(expected: {
    readonly text: string;
    readonly itemId?: string;
    readonly baseItemVersion?: string;
  }): Promise<DialogueChange> {
    const change = await this.nextKind('HISTORY_TEXT_APPENDED');
    if (change.textDelta !== expected.text) {
      throw new Error(
        `Expected text delta ${JSON.stringify(expected.text)}, received ${JSON.stringify(change.textDelta)}.`,
      );
    }
    if (expected.itemId !== undefined && change.itemId !== expected.itemId) {
      throw new Error(`Expected item ${expected.itemId}, received ${change.itemId ?? 'none'}.`);
    }
    if (
      expected.baseItemVersion !== undefined &&
      change.baseItemVersion !== expected.baseItemVersion
    ) {
      throw new Error(
        `Expected base item version ${expected.baseItemVersion}, received ${change.baseItemVersion ?? 'none'}.`,
      );
    }
    return change;
  }

  expectItem(): Promise<DialogueChange> {
    return this.nextKind('HISTORY_ITEM_UPSERTED');
  }

  async close(): Promise<void> {
    this.controller.abort();
    await this.reader.cancel().catch(() => undefined);
  }

  private async readNext(): Promise<DialogueChange> {
    while (true) {
      const normalized = this.buffer.replaceAll('\r\n', '\n');
      const boundary = normalized.indexOf('\n\n');
      if (boundary >= 0) {
        const block = normalized.slice(0, boundary);
        this.buffer = normalized.slice(boundary + 2);
        const data = block
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice('data:'.length).trimStart())
          .join('\n');
        if (data.length === 0) {
          continue;
        }
        const payload: unknown = JSON.parse(data);
        if (!isSubscriptionPayload(payload)) {
          throw new Error('Dialogue subscription returned an invalid payload.');
        }
        if (payload.errors !== undefined) {
          throw new Error(payload.errors.map(({ message }) => message).join('\n'));
        }
        if (payload.data?.dialogueChanges !== undefined) {
          return payload.data.dialogueChanges;
        }
        continue;
      }
      const result = await this.reader.read();
      if (result.done) {
        throw new Error('Dialogue change stream ended before the next event.');
      }
      this.buffer += this.decoder.decode(result.value, { stream: true });
    }
  }

  private async withTimeout<T>(operation: () => Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            const error = new Error('Timed out waiting for a dialogue change.');
            this.controller.abort(error);
            reject(error);
          }, 5_000);
        }),
      ]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }
}

interface SubscriptionPayload {
  readonly data?: { readonly dialogueChanges?: DialogueChange };
  readonly errors?: readonly { readonly message: string }[];
}

const isSubscriptionPayload = (value: unknown): value is SubscriptionPayload =>
  typeof value === 'object' && value !== null;
