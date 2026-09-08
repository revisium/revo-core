# GraphQL subscriptions

## Transport and ownership

`GraphqlSubscriptionsModule` owns the shared SSE transport lifecycle. `GraphqlApiModule` supplies
its plugins to the Nest Yoga driver. The official `@graphql-yoga/plugin-graphql-sse` implements
the [GraphQL SSE single-connection protocol](https://github.com/enisdenjo/graphql-sse/blob/master/PROTOCOL.md)
at `/graphql/stream`, following [Yoga's integration](https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions):

| Request                                                      | Purpose                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `PUT`, `Accept: text/plain`                                  | Reserve a stream; returns `201` with an opaque token                     |
| `GET`, `Accept: text/event-stream`                           | Open the one long-lived stream using that token                          |
| `POST`, JSON GraphQL operation with `extensions.operationId` | Start an independent operation; returns `202`                            |
| `DELETE ?operationId=…`                                      | Cancel one operation while keeping the stream and other operations alive |

The token travels in `x-graphql-event-stream-token`. It identifies a process-local transport
reservation; it is not a user credential. Existing deployment access controls remain required.
The server sends protocol heartbeat comments every 12 seconds. Clients own reconnect/backoff and
recreate the reservation and active operations after a disconnection.

The pinned upstream handler has no expiry or explicit deletion for an empty reservation. If a
client completes `PUT` but abandons setup before `GET`, that reservation can remain until the
backend restarts. Established stream disconnection does release its reservation. The client also
must cancel a failed or aborted operation registration with `DELETE`: the upstream handler can
reserve an operation ID before GraphQL validation fails. These are upstream lifecycle limitations;
the backend does not maintain a second protocol registry to work around them.

The existing `/graphql` endpoint still handles queries, mutations, and distinct-connection SSE.
The GraphQL schema is shared. No WebSocket server, second topic registry, or per-feature SSE
endpoint is needed.

## Registering a subscription

1. Expose a typed `AsyncIterable<Event>` through the owning feature's API service. In a CQRS
   feature, the API dispatches its query to the handler that owns the source.
2. Declare GraphQL arguments and a transport model beside the feature resolver.
3. Add a normal Nest `@Subscription` method to that resolver, and register the resolver in
   `GraphqlApiModule` if it is new. Regenerate API contracts when the schema changes.

For example, the existing dialogue resolver delegates directly to the dialogue API:

```ts
@Subscription(() => DialogueChangeModel, { resolve: (change: unknown) => change })
dialogueSummaryChanges(@Args('after', { nullable: true }) after?: string) {
  return this.dialoguesApi.changes({
    summaryOnly: true,
    ...(after == null ? {} : { after }),
  });
}
```

The transport does not know which subscriptions belong to dialogues. The dialogue engine can
keep one summaries operation for the sidebar and one detailed operation scoped to the open
dialogue. Other features register their own operations on the same browser transport.

## Producer contracts

**Durable event feeds** accept an opaque replay cursor. The owning feature defines ordering,
retention, duplicate handling, and the cursor error contract. A client advances its cursor only
after applying the event successfully, and prepares new variables from that cursor on reconnect.
The SSE reservation token and operation ID are not replay cursors.

**State feeds** deliver an initial snapshot followed by changes. Snapshot capture and listener
registration must have one consistent boundary, so changes between them cannot be missed. A
reconnected subscriber obtains a fresh snapshot; it does not require a durable event journal.

Every source must release resources through an idempotent `return()`, including while `next()`
is pending. Avoid an async generator that waits forever without an interruptible event source:
its queued `return()` cannot interrupt that wait. Natural completion ends only that operation.

## Errors and shutdown

The Envelop subscription boundary turns iterator failures into one GraphQL error result followed
by operation completion, so a failing producer cannot tear down unrelated operations. Explicit
GraphQL error codes survive; expected HTTP input/not-found errors are mapped to safe codes;
unexpected failures become `INTERNAL_SERVER_ERROR` with a generic message. Cleanup failure is
logged server-side and does not escape onto the shared stream.

Malformed or invalid GraphQL operation requests return a coded `400` response. Resolver failures
and iterator failures are delivered for their operation. Clients stop a failed operation; they
do not reconnect every subscription for a permanent operation error.

On disconnect, the protocol cancels every active operation. On Nest module shutdown, the transport
aborts tracked multiplex stream requests so clients cannot hold HTTP shutdown open indefinitely. Sources
remain responsible for promptly stopping their own IO after cancellation.

The small adapter covers integration behavior not supplied by Nest Yoga alone: request abort on
shutdown, isolated iterator errors, and errors-only execution result normalization for the pinned
graphql-sse handler. Protocol reservation, multiplexing, heartbeat, and cancellation remain owned
by the official plugin.

## Deployment

Route `/graphql/stream` and all four HTTP methods through the proxy. Disable response buffering
and keep the stream idle timeout longer than its heartbeat interval. If a deployment has several
backend processes, all requests for one stream token must reach the same process; reservations
are in memory. Reconnect can establish a new reservation on another process, while recovery uses
the feature's durable cursor or fresh snapshot.

The browser opens one SSE stream per tab. This is one long-lived response, not a claim that the
browser uses only one physical TCP connection: reservation and operation control use short HTTP
requests, and HTTP/2 may multiplex those at the network layer.
