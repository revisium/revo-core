<div align="center">

# @revisium/revo-core

**Target long-running NestJS application for durable Revo orchestration.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

> **MVP status:** this document describes the target MVP architecture. It is not
> an implemented or released API. Until committed OpenAPI, GraphQL SDL, and MCP
> specifications exist, this README is the interim architecture authority, not
> a wire-contract authority.

## Target Responsibilities

`revo-core` is planned to:

- expose one application model through REST/OpenAPI, GraphQL, and stateless
  Streamable HTTP MCP adapters;
- route commands and queries through application CQRS handlers;
- resolve every accepted run into an immutable `ExecutionPlan`;
- persist orchestration state, execution-only resources, projections, and
  inbox/idempotency records in a provisioned PostgreSQL database through Prisma;
- compose `revo-run`, `revo-agent-runtime`, and `revo-scripts` behind injected
  executor interfaces;
- own application startup, health, quiesce, drain, and shutdown.

## Target Boundaries

| Package | Target ownership |
| --- | --- |
| [`revo`](https://github.com/revisium/revo) | Standalone distribution, installation, configuration, and OS service management. |
| [`revo-cli`](https://github.com/revisium/revo-cli) | Terminal UX and automation client; calls `revo-core` rather than owning orchestration. |
| `revo-core` | Durable application state, CQRS, API adapters, execution-plan pinning, and process lifecycle. |
| [`revo-run`](https://github.com/revisium/revo-run) | Execution of a pinned plan and run-level coordination. |
| [`revo-pipeline`](https://github.com/revisium/revo-pipeline) | Pipeline definitions, validation, and deterministic pipeline planning. |
| [`revo-agent-runtime`](https://github.com/revisium/revo-agent-runtime) | Agent discovery, invocation, reconciliation, cancellation, and runtime adapters. |
| [`revo-scripts`](https://github.com/revisium/revo-scripts) | Typed execution of the bounded script catalog and its provider adapters. |

The MVP does not make `revo-core` an OS service manager, PostgreSQL distributor,
terminal application, general workspace product, or arbitrary script host.

## Target Request Flow

All target transports share the same application boundary:

```text
REST/OpenAPI ─┐
GraphQL ──────┼─> CQRS commands and queries
POST /mcp ────┘        │
                       v
              application handlers
                       │
                       v
          persistence and executor adapters
                       │
                       v
       PostgreSQL state and read projections
```

- REST is planned for `revo-cli` and automation clients.
- GraphQL is planned for interactive clients, read models, and subscriptions.
- MCP is planned for agent-facing tools over stateless Streamable HTTP.

Transport adapters authenticate, validate, and translate requests. They do not
own orchestration policy. Command handlers own state transitions; query handlers
read projections. Executors and persistence remain behind application ports.

## Target Execution Plan Invariant

Before a run becomes visible:

1. `revo-core` resolves referenced pipeline, agent, script, and configuration
   inputs;
2. `revo-core` produces a canonical immutable `ExecutionPlan` and computes its
   digest;
3. `revo-core` persists the exact plan and digest in core-owned plan storage;
4. `revo-core` calls `@revisium/revo-run`'s `RunManager.startRun` with the exact
   plan pin, input, and idempotency key; and
5. `revo-run` atomically persists the initial run state, activations/events, and
   exact plan pin before exposing the run.

The two storage steps do not imply a cross-store transaction. Recovery loads
the exact persisted plan through its pin and must never re-resolve or replan the
run. Definition and configuration updates affect only future runs.

Execution-only resources, read projections, and inbox/idempotency records support
this invariant. They are not independent authorities that may change whether a
run was accepted or which plan it executes.

## Target Transports

### REST/OpenAPI

The following route is illustrative:

```http
POST /api/runs
Content-Type: application/json

{
  "pipeline": "example",
  "input": {}
}
```

REST is planned to expose commands and operational queries suitable for CLI and
automation. A future committed OpenAPI document will be authoritative for paths,
schemas, status codes, authentication, idempotency, and errors.

### GraphQL

GraphQL is planned to expose interactive read models, commands, and
subscriptions without bypassing CQRS. A future committed SDL and resolver
contract will be authoritative.

### MCP

The MVP target is one stateless Streamable HTTP endpoint:

```http
POST /mcp
Content-Type: application/json
```

Each request is self-contained JSON. The MVP does not provide MCP session
resume, server-side session replay, or transport-owned orchestration state.
Tool names, schemas, authentication, and error mapping belong in a future
committed MCP specification.

## Target Process Lifecycle

Application process lifecycle is distinct from OS service management. The
standalone `revo` distribution may install or supervise a service; `revo-core`
only manages its own process.

Startup is planned to:

1. require a provisioned PostgreSQL database through `DATABASE_URL`;
2. connect with bounded retry rather than retry forever;
3. apply or verify the required Prisma migrations/schema;
4. initialize persistence, managers, executors, and transports in dependency
   order; and
5. report readiness only after every required component is usable.

Migration or schema failure prevents readiness. Partial startup rolls back
initialized components in reverse order. If connection retries are exhausted or
startup otherwise cannot complete, the process performs that cleanup and exits
non-zero. Restart policy belongs to the OS supervisor owned by `revo`.

Liveness reports whether the process can continue running. Readiness reports
whether it can accept new work. During shutdown, readiness fails first and the
application:

1. quiesces transports and rejects new run-creating commands;
2. gives `@revisium/revo-run`'s `RunManager` a bounded interval to drain active
   work;
3. shuts down `AgentManager`;
4. closes MCP, GraphQL, and REST transports; and
5. disconnects Prisma.

Drain timeout and interrupted work handling must be explicit in the future
lifecycle specification; shutdown must not wait without a bound.

## Target Dependencies

Dependencies point inward from transport and infrastructure adapters to
application ports and domain policy. Application handlers do not import
transport concerns, Prisma models, or concrete runtime providers.

`revo-core` is planned to depend on:

- `revo-run`, whose `RunManager` owns run start and drain while concrete run
  executors are injected at composition time;
- `revo-agent-runtime`, with `AgentManager` and provider adapters injected;
- `revo-scripts`, exposed only through the approved typed script catalog;
- `revo-pipeline`, transitively through `revo-run` unless a planning port is
  required by the committed implementation;
- NestJS for composition and transports; and
- Prisma plus a mandatory provisioned PostgreSQL database.

Concrete executor ownership stays in the execution packages. `revo-core`
coordinates them and persists durable application decisions.

## MVP Limits

The target MVP is intentionally limited to a single `revo-core` process backed
by one provisioned PostgreSQL database and the bounded execution capabilities of
the packages above.

Deferred beyond the MVP:

- external queues and cluster scheduling;
- a general vault, secrets manager, or workspace product;
- arbitrary user-supplied script execution;
- rich analytics and reporting;
- MCP session resume or replay;
- embedded PostgreSQL distribution; and
- OS service installation, supervision, upgrades, or recovery policy.

These items require separate specifications and must not be inferred from the
illustrative routes in this README.
