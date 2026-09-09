# @revisium/revo-core

Revo's backend for persistent agent dialogues and durable pipeline runs. Core owns
PostgreSQL data, agent execution, and the GraphQL and REST APIs used by
[revo-admin](https://github.com/revisium/revo-admin).

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
required executables available on `PATH`. Agent processes inherit `HOME` and `PATH`
by default. If a provider needs API-key environment variables, set them for Core
and add their names to the comma-separated `REVO_AGENT_INHERIT_ENV` allowlist while
keeping `HOME,PATH`.

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
