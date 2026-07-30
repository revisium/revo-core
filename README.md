<div align="center">

# @revisium/revo-core

**Target independently deployable, long-running NestJS daemon and service owner for Revo orchestration.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

> Initial architecture stage. The target API is not implemented.

## Responsibilities

- Provide application CQRS shared by REST/OpenAPI, GraphQL, and MCP adapters.
- Persist application data in PostgreSQL through Prisma.
- Compose `revo-run`, `revo-agent-runtime`, and `revo-scripts`.

## Boundaries

- Does not own embedded PostgreSQL packaging.
- Does not own terminal UX.
- Does not own standalone installation or service lifecycle.

## Target API

Planned REST request:

```http
POST /api/runs
Content-Type: application/json

{
  "input": {}
}
```

The future OpenAPI specification will be the authority for the HTTP contract.

## Dependencies

- `revo-run`
- `revo-agent-runtime`
- `revo-scripts`
- `revo-pipeline` transitively through `revo-run`
- PostgreSQL and Prisma
