import { useGraphQLSSE } from '@graphql-yoga/plugin-graphql-sse';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { GraphQLError } from 'graphql';

import {
  isGraphqlError,
  isolateSubscriptionResult,
  subscriptionError,
} from './subscription-result.js';

@Injectable()
export class GraphqlSubscriptionTransport implements OnModuleDestroy {
  private readonly streams = new Set<AbortController>();
  private readonly requests = new WeakMap<Request, AbortController>();
  private stopping = false;

  readonly plugins: ReturnType<typeof useGraphQLSSE>[] = [
    {
      onRequest: (context) => {
        const { request, fetchAPI } = context;

        if (this.stopping) {
          context.endResponse(new fetchAPI.Response(null, { status: 503 }));

          return;
        }

        if (
          new URL(request.url).pathname !== '/graphql/stream' ||
          request.method !== 'GET' ||
          !request.headers.get('accept')?.includes('text/event-stream')
        ) {
          return;
        }

        const controller = new AbortController();
        const abort = () => controller.abort();
        const cleanup = () => {
          request.signal.removeEventListener('abort', abort);
          this.streams.delete(controller);
        };
        controller.signal.addEventListener('abort', cleanup, { once: true });
        request.signal.addEventListener('abort', abort, { once: true });
        this.streams.add(controller);
        const replacement = new fetchAPI.Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          signal: controller.signal,
        });
        this.requests.set(replacement, controller);
        context.setRequest(replacement);

        if (request.signal.aborted) {
          controller.abort();
        }
      },
      onResponse: ({ request, response }) => {
        if (!response.headers.get('content-type')?.includes('text/event-stream')) {
          this.requests.get(request)?.abort();
        }
      },
      onSubscribe: ({ context }) => ({
        onSubscribeResult: ({ result, setResult }) => {
          if (new URL(context.request.url).pathname !== '/graphql/stream') {
            return;
          }

          if (Symbol.asyncIterator in result) {
            setResult(isolateSubscriptionResult(result));
          } else if (result.errors !== undefined) {
            // graphql-sse recognizes a one-off execution result by its data property.
            setResult({ ...result, data: null, errors: result.errors.map(subscriptionError) });
          }
        },
      }),
      onValidate:
        ({ context }) =>
        ({ result }) => {
          if (new URL(context.request.url).pathname !== '/graphql/stream') {
            return;
          }
          const error: unknown = result[0];

          if (isGraphqlError(error)) {
            throw new GraphQLError(error.message, {
              extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
            });
          }
        },
    },
    this.ssePlugin(),
  ];

  onModuleDestroy(): void {
    this.stopping = true;

    for (const controller of this.streams) {
      controller.abort();
    }
  }

  private ssePlugin(): ReturnType<typeof useGraphQLSSE> {
    const plugin = useGraphQLSSE({ endpoint: '/graphql/stream' });

    return {
      ...plugin,
      async onRequest(context) {
        try {
          await plugin.onRequest?.(context);
        } catch (error) {
          if (!isGraphqlError(error)) {
            throw error;
          }

          context.endResponse(
            context.fetchAPI.Response.json({ errors: [subscriptionError(error)] }, { status: 400 }),
          );
        }
      },
    };
  }
}
