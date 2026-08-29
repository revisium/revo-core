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
- PostgreSQL with Prisma-owned product data and DBOS-owned workflow state.

## Boundaries

- Does not own embedded PostgreSQL packaging.
- Does not own terminal UX.
- Does not own standalone installation or service lifecycle.

Agent execution, method planning, MCP, installation packaging, and the product UI are not implemented yet.

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

Runs accept independent selectors: exactly one of `pipelineId` or `pipeline`, and exactly one of
`profileId` or `profile`:

```http
POST /api/runs
GET /api/runs/:runId
```

The `startRun` mutation and `run` query expose the same contract in GraphQL. ID selectors read the
current Catalog HEAD through the exported `PlaybookCatalogModule` API. Direct documents bypass the
Catalog. `@revisium/revo-run` owns document validation, pipeline compilation, admission, and durable
execution.

Feature modules expose transport-agnostic API services; transports and other features consume those
services instead of feature internals. See [REVIEW.md](REVIEW.md) for the detailed module rules.

## GraphQL subscriptions

GraphQL Yoga serves subscriptions on the existing `/graphql` endpoint using GraphQL over
Server-Sent Events in distinct-connections mode. A client opens one HTTP event stream per
subscription with `Accept: text/event-stream`.

Subscription resolvers consume feature-owned `AsyncIterable` sources. Revo Core does not add an
in-memory PubSub layer; durable or distributed event delivery belongs to the feature that owns the
events. Single-connection SSE and WebSocket transports are not enabled.

Natural source completion sends the GraphQL SSE `complete` event. When a client unsubscribes by
closing its HTTP stream, Yoga calls `return()` on the source iterator; feature-owned iterators must
use that signal to release listeners, readers, and other per-subscription resources.

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
- PostgreSQL and Prisma

`revo-agent-runtime` is a planned execution adapter for this composition.
