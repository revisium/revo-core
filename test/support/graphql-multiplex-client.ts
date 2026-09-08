import type { GraphqlSseEvent } from './graphql-sse-client.js';

export class GraphqlMultiplexClient {
  readonly events: GraphqlSseEvent[] = [];
  private readonly controller = new AbortController();
  private token = '';
  private reading: Promise<void> | undefined;

  constructor(private readonly endpoint: string) {}

  async connect(): Promise<void> {
    const reservation = await fetch(this.endpoint, {
      method: 'PUT',
      headers: { accept: 'text/plain' },
      signal: AbortSignal.timeout(2_000),
    });

    if (reservation.status !== 201) {
      throw new Error(`Reservation failed: ${reservation.status}`);
    }
    this.token = await reservation.text();
    const response = await fetch(this.endpoint, {
      headers: { ...this.headers(), accept: 'text/event-stream' },
      signal: this.controller.signal,
    });

    if (response.status !== 200 || response.body === null) {
      throw new Error(`Stream failed: ${response.status}`);
    }
    this.reading = this.read(response.body).catch((error: unknown) => {
      if (!this.controller.signal.aborted) {
        throw error;
      }
    });
  }

  subscribe(operationId: string, query: string, variables?: Record<string, unknown>) {
    return fetch(this.endpoint, {
      method: 'POST',
      headers: { ...this.headers(), 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables, extensions: { operationId } }),
      signal: AbortSignal.timeout(2_000),
    });
  }

  cancel(operationId: string) {
    return fetch(`${this.endpoint}?operationId=${encodeURIComponent(operationId)}`, {
      method: 'DELETE',
      headers: this.headers(),
      signal: AbortSignal.timeout(2_000),
    });
  }

  async close(): Promise<void> {
    this.controller.abort();
    await this.reading;
  }

  private headers() {
    return { 'x-graphql-event-stream-token': this.token };
  }

  private async read(body: ReadableStream<Uint8Array>): Promise<void> {
    let buffer = '';
    const decoder = new TextDecoder();

    for await (const chunk of body) {
      buffer += decoder.decode(chunk, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        const lines = block.split('\n');
        const event = lines
          .find((line) => line.startsWith('event:'))
          ?.slice(6)
          .trim();
        const data = lines
          .find((line) => line.startsWith('data:'))
          ?.slice(5)
          .trim();

        if (event !== undefined) {
          this.events.push({ event, ...(data ? { data: JSON.parse(data) as unknown } : {}) });
        }
      }
    }
  }
}
