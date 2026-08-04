<div align="center">

# @revisium/revo-core

**Target independently deployable, long-running NestJS daemon and service owner for Revo orchestration.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

> Initial architecture stage. Only the transport and CQRS foundation is implemented.

## Current foundation

- NestJS application lifecycle.
- Application CQRS shared by GraphQL and REST.
- GraphQL Yoga at `/graphql`.
- REST and Swagger at `/api`.
- Committed GraphQL and OpenAPI contracts.

## Boundaries

- Does not own embedded PostgreSQL packaging.
- Does not own terminal UX.
- Does not own standalone installation or service lifecycle.

No run execution, persistence, MCP, or `revo-*` package integration exists yet.

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

## Development

```bash
pnpm install
pnpm verify
pnpm start:dev
```

Run `pnpm generate:api-contracts` only when intentionally changing a public API.

## Future composition

- `revo-run`
- `revo-agent-runtime`
- `revo-scripts`
- `revo-pipeline` transitively through `revo-run`
- PostgreSQL and Prisma
