# @revisium/revo-core

Revo's backend for persistent agent dialogues and durable pipeline runs. Core owns
PostgreSQL data, agent execution, and the GraphQL and REST APIs used by
[revo-admin](https://github.com/revisium/revo-admin).

## Programmatic runtime

`@revisium/revo-core` is designed to run inside the top-level Revo process. The
caller owns PostgreSQL startup, process signals, and static admin assets; Core owns
its application schema, DBOS schema, Nest application, APIs, and shutdown lifecycle.
The same `databaseUrl` contract works with an embedded PostgreSQL instance or an
external server.

```ts
import { createRevoCoreRuntime } from '@revisium/revo-core';

const runtime = await createRevoCoreRuntime({
  databaseUrl: 'postgresql://user:password@127.0.0.1:54321/revo',
  onStage: ({ stage, status }) => showProgress(stage, status),
});

runtime.configureAfterCoreRoutes((app) => {
  app.use(adminStaticMiddleware);
  app.use(spaFallback);
});

await runtime.prepareDatabase();
const listening = await runtime.listen({ host: '127.0.0.1', port: 0 });
```

Database preparation always applies Core's Prisma migrations before the DBOS
system migrations required by `@revisium/revo-run`. It is safe to call repeatedly,
and `listen()` also performs any missing preparation and initialization. Lifecycle
events report `started`, `completed`, or `failed` for each preparation, bootstrap,
and readiness stage without requiring stdout parsing.

Use `configureAfterCoreRoutes()` for static middleware and SPA fallback. It places
them after GraphQL and REST routes but before Core's final 404/error handlers. The
raw `runtime.app.use()` method does not provide that ordering guarantee.

Call `await runtime.close()` during shutdown. Closing is idempotent, stops HTTP
admission, shuts down agent and DBOS resources, closes Nest and Prisma, and waits
for the listener to terminate. Core supports one initialized runtime per process.
Consumers must run Node.js 24.15 or newer within the Node 24 release line.

## Local development

Install Node.js 24 (24.15 or newer), pnpm, and Docker with Compose. With `nvm`,
`nvm install && nvm use` selects the version in `.nvmrc`. Run `corepack enable`
to use the pnpm version declared in `package.json`.

From this checkout, install dependencies:

```bash
pnpm install --frozen-lockfile
```

Create an ignored `.env` file:

```dotenv
DATABASE_URL=postgresql://revo:revo@127.0.0.1:55433/revo
REVO_HOST=127.0.0.1
REVO_PORT=19222
```

Start the supplied disposable PostgreSQL database, generate the Prisma client,
apply migrations, and start Core:

```bash
pnpm db:test:up
pnpm db:generate
pnpm db:migrate:deploy
pnpm start:dev
```

The supplied database stores data in memory: stopping its container loses dialogues
and runs. Stop Core with Ctrl+C and remove the database with `pnpm db:test:down`.
For persistent development data, use a separate PostgreSQL 17 database with durable
storage, set its `DATABASE_URL` in `.env`, and skip `db:test:up`. Apply migrations
with the same command above. Verification uses the separate disposable `.env.test`
configuration; do not point tests at data you want to keep.

Core listens at `http://127.0.0.1:19222`. Check `GET /api/system` for readiness;
open `/graphql` for GraphQL or `/api` for Swagger. `start:dev` builds and starts the
server once; rerun it after source changes.

Keep Core running, then follow the
[Admin setup](https://github.com/revisium/revo-admin#local-development) in a second
terminal. Admin's development server proxies backend requests to port `19222`.

## Agent access

Authenticate the chosen agent provider on the machine running Core and make its
required executables available on `PATH`. Core preserves the platform's standard
user, home, path, shell, temporary-directory, and XDG configuration variables for
agent processes by default. This includes `USER`/`LOGNAME` on Unix-like systems,
which macOS Keychain-backed CLI authentication may require. If a provider needs
additional API-key variables, set them for Core and provide the complete desired
comma-separated allowlist through `REVO_AGENT_INHERIT_ENV`.

The runtime workspace defaults to `~/.revo/sessions` and must be writable. Override
it with `REVO_AGENT_WORKSPACE_ROOT` in `.env` when needed. See
[runtime configuration](docs/architecture/agent-runtime.md) for execution and
recovery behavior.

## API and verification

The committed GraphQL schema and OpenAPI document define the API contracts.
Queries and mutations use `/graphql`; multiplexed subscriptions use
`/graphql/stream`. See [subscription registration and contracts](docs/architecture/graphql-subscriptions.md)
for adding a feed and deploying SSE.

Follow [VERIFICATION.md](VERIFICATION.md) for the local checks and
[REVIEW.md](REVIEW.md) for repository conventions. Regenerate API contracts only
when intentionally changing a public API.
