export interface GraphqlSseEvent {
  readonly event: string;
  readonly data?: unknown;
}

export interface GraphqlSseSubscription {
  unsubscribe: () => Promise<void>;
}

const GRAPHQL_SSE_TIMEOUT_MS = 2_000;

const withGraphqlSseTimeout = async <Result>(
  operation: (controller: AbortController) => Promise<Result>,
  timeoutMessage: string,
): Promise<Result> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error(timeoutMessage)),
    GRAPHQL_SSE_TIMEOUT_MS,
  );

  try {
    return await operation(controller);
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const rejectWhenAborted = (signal: AbortSignal): Promise<never> =>
  new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });

const requestSubscription = async (
  endpoint: string,
  query: string,
  signal: AbortSignal,
): Promise<Response> => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      Connection: 'close',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`GraphQL subscription failed with status ${response.status}.`);
  }
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new Error('GraphQL subscription did not return an SSE response.');
  }

  return response;
};

const parseEvent = (block: string): GraphqlSseEvent | undefined => {
  const lines = block.split('\n');
  const event = lines
    .find((line) => line.startsWith('event:'))
    ?.slice('event:'.length)
    .trim();
  if (event === undefined) {
    return undefined;
  }

  const serializedData = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n');

  if (serializedData.length === 0) {
    return { event };
  }

  const data: unknown = JSON.parse(serializedData);
  return { event, data };
};

export const collectGraphqlSseEvents = async (
  endpoint: string,
  query: string,
): Promise<readonly GraphqlSseEvent[]> =>
  withGraphqlSseTimeout(async (controller) => {
    const response = await requestSubscription(endpoint, query, controller.signal);
    const body = (await response.text()).replaceAll('\r\n', '\n');

    return body
      .split('\n\n')
      .map(parseEvent)
      .filter((event): event is GraphqlSseEvent => event !== undefined);
  }, 'Timed out while collecting GraphQL SSE events.');

export const openGraphqlSseSubscription = async (
  endpoint: string,
  query: string,
): Promise<GraphqlSseSubscription> =>
  withGraphqlSseTimeout(async (controller) => {
    const response = await requestSubscription(endpoint, query, controller.signal);
    if (response.body === null) {
      throw new Error('GraphQL subscription response has no body.');
    }

    const reader = response.body.getReader();
    await reader.read();

    return {
      unsubscribe: () =>
        withGraphqlSseTimeout(async (cancellationController) => {
          const abortRequest = () => controller.abort(cancellationController.signal.reason);
          cancellationController.signal.addEventListener('abort', abortRequest, { once: true });

          try {
            await Promise.race([reader.cancel(), rejectWhenAborted(cancellationController.signal)]);
          } finally {
            cancellationController.signal.removeEventListener('abort', abortRequest);
            controller.abort();
          }
        }, 'Timed out while closing the GraphQL SSE subscription.'),
    };
  }, 'Timed out while opening the GraphQL SSE subscription.');

export const waitForGraphqlSseLifecycle = (
  lifecycle: Promise<void>,
  description: string,
): Promise<void> =>
  withGraphqlSseTimeout(
    (controller) => Promise.race([lifecycle, rejectWhenAborted(controller.signal)]),
    `Timed out waiting for ${description}.`,
  );
