# GraphQL subscriptions

## Register a feed

Expose a typed `AsyncIterable<Event>` through the owning feature's API service. Add its GraphQL
model, arguments, and a normal Nest `@Subscription` method; register new resolvers in
`GraphqlApiModule` and regenerate contracts when the schema changes. For example:

```ts
@Subscription(() => DialogueChangeModel, { resolve: (change: unknown) => change })
dialogueSummaryChanges(@Args('after', { nullable: true }) after?: string) {
  return this.dialoguesApi.changes({
    summaryOnly: true,
    ...(after == null ? {} : { after }),
  });
}
```

Features own delivery semantics; no parallel topic registry is needed. Durable feeds define replay
cursors, ordering, and retention. Clients advance cursors after applying events. State feeds must
capture their initial snapshot and register changes consistently; reconnect returns a fresh snapshot.
Every source must release resources through idempotent `return()`, even while `next()` is pending.

## Core transport guarantees

`GraphqlSubscriptionsModule` supplies the official Yoga SSE plugin at `/graphql/stream`.
Its adapter isolates producer errors into terminal operation results, preserves public error codes,
masks unexpected errors, and aborts active multiplex streams on Nest shutdown. Cancelling or failing
one operation leaves its siblings subscribed. Existing `/graphql` HTTP and distinct SSE remain intact.

Use one long-lived stream per browser tab, with independent logical subscriptions: for example,
sidebar summaries and detailed events for the open dialogue. The [upstream protocol](https://github.com/enisdenjo/graphql-sse/blob/master/PROTOCOL.md)
owns reservation (`PUT`), stream (`GET`), operation registration (`POST`), cancellation (`DELETE`),
and 12-second heartbeats. The opaque token is a process-local reservation identifier, not authentication
or a replay cursor. See [Yoga's integration](https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions).

## Provider and proxy constraints

Route all four methods through the proxy, disable response buffering, and keep idle timeouts longer
than the heartbeat interval. All requests for one token must reach the same backend process.
Reconnect creates a new reservation and resumes each feature from its cursor or snapshot.

The pinned upstream handler has no expiry/deletion for a reservation abandoned between `PUT` and
`GET`; it can remain until backend restart. Established stream disconnection releases its reservation.
Clients must also `DELETE` failed or aborted operation registrations because the handler reserves
operation IDs before validation. Core does not maintain a second protocol registry to mask these
provider limitations.
