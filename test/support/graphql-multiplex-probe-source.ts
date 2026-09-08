export class MultiplexProbeSource implements AsyncIterableIterator<string> {
  private readonly queue: IteratorResult<string>[] = [];
  private pending: ReturnType<typeof Promise.withResolvers<IteratorResult<string>>> | undefined;
  private stopped = false;
  readonly released = Promise.withResolvers<void>();

  [Symbol.asyncIterator]() {
    return this;
  }

  next(): Promise<IteratorResult<string>> {
    const queued = this.queue.shift();

    if (queued !== undefined) {
      return Promise.resolve(queued);
    }

    if (this.stopped) {
      return Promise.resolve({ done: true, value: undefined });
    }
    this.pending = Promise.withResolvers<IteratorResult<string>>();

    return this.pending.promise;
  }

  async return(): Promise<IteratorResult<string>> {
    this.complete();
    this.released.resolve();

    return { done: true, value: undefined };
  }

  emit(value: string): void {
    this.enqueue({ done: false, value });
  }

  complete(): void {
    this.stopped = true;
    this.enqueue({ done: true, value: undefined });
  }

  fail(error: Error): void {
    this.pending?.reject(error);
    this.pending = undefined;
  }

  private enqueue(result: IteratorResult<string>): void {
    if (this.pending !== undefined) {
      this.pending.resolve(result);
      this.pending = undefined;
    } else {
      this.queue.push(result);
    }
  }
}
