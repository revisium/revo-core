<div align="center">

# @revisium/revo-core

**Target independently deployable, long-running NestJS daemon and service owner for Revo orchestration.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

> Initial architecture stage. The first DBOS-backed run slice is implemented.

## Current foundation

- NestJS application lifecycle.
- Application CQRS shared by GraphQL and REST.
- GraphQL Yoga at `/graphql`, including subscriptions over GraphQL SSE.
- REST and Swagger at `/api`.
- Committed GraphQL and OpenAPI contracts.
- Durable pipeline execution through `@revisium/revo-run`.
- Agent discovery, configuration inspection, and execution through
  `@revisium/revo-agent-runtime`.
- Persistent Dialogue APIs backed by PostgreSQL.
- PostgreSQL with Prisma-owned product data and DBOS-owned workflow state.

## Boundaries

- Does not own embedded PostgreSQL packaging.
- Does not own terminal UX.
- Does not own standalone installation or service lifecycle.

Method planning, MCP, installation packaging, and the product UI are not implemented yet.

## Current API

```graphql
query {
  systemInfo {
    name
    status
  }
}
```

```http
GET /api/system
```

Both return:

```json
{
  "name": "revo-core",
  "status": "ok"
}
```

## Runs

Run APIs are available through REST and GraphQL. The generated OpenAPI and GraphQL schemas are the
current contracts.

## GraphQL subscriptions

GraphQL Yoga serves multiplexed subscriptions at `/graphql/stream`: clients can carry independent
subscriptions over one event stream per browser tab. Queries, mutations, and distinct-connection
subscriptions remain available at `/graphql`.

Subscription resolvers consume feature-owned `AsyncIterable` sources. Revo Core does not add an
in-memory PubSub layer; durable or distributed event delivery belongs to the feature that owns the
events. WebSocket transport is not enabled.

Natural source completion sends the GraphQL SSE `complete` event. When a client unsubscribes by
closing its HTTP stream, Yoga calls `return()` on the source iterator; feature-owned iterators must
use that signal to release listeners, readers, and other per-subscription resources.

See [subscription architecture and registration](docs/architecture/graphql-subscriptions.md)
for producer contracts, cancellation, recovery, and proxy routing.

## Agents and dialogues

GraphQL exposes agent definitions and configuration catalogs for selecting a runtime provider and
model. Runtime sessions are an internal execution detail. Persistent Dialogue APIs own multi-turn
history, status, interactions, read state, idempotent commands, and resumable SSE delivery
independently of pipeline Runs.

## Development

```bash
pnpm install
pnpm db:test:up
pnpm db:migrate:deploy
pnpm verify
pnpm start:dev
```

Run `pnpm generate:api-contracts` only when intentionally changing a public API.

## Composition

- `revo-run`
- `revo-agent-runtime`
- PostgreSQL and Prisma

Core owns one agent manager shared by sessions and pipeline Attempts.
See [runtime composition and configuration](docs/architecture/agent-runtime.md).
