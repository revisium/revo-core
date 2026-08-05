<div align="center">

# @revisium/revo-core

**Target independently deployable, long-running NestJS daemon and service owner for Revo orchestration.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

> Initial architecture stage. The first DBOS-backed run slice is implemented.

## Current foundation

- NestJS application lifecycle.
- Application CQRS shared by GraphQL and REST.
- GraphQL Yoga at `/graphql`.
- REST and Swagger at `/api`.
- Committed GraphQL and OpenAPI contracts.
- Durable pipeline execution through `@revisium/revo-run`.
- Temporary MVP task execution without external effects.
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

Runs can be started with a public `PipelineDefinition`. Revo Core validates and compiles it before
starting the durable workflow:

```http
POST /api/runs
GET /api/runs/:runId
```

or the `startRun` mutation and `run` query in GraphQL.

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
- `revo-pipeline`
- PostgreSQL and Prisma

`revo-agent-runtime` and `revo-scripts` are the next execution adapters planned for this composition.
