# Verification

Run before requesting review:

```bash
pnpm db:test:up
pnpm db:test:migrate
pnpm verify
pnpm db:test:down
```

This checks formatting, TypeScript, Oxlint, build, GraphQL and OpenAPI contracts,
real DBOS-backed transport smoke tests, and produces the LCOV report consumed by Sonar.
`build` generates the Prisma client from `prisma/schema.prisma` before compiling.
The client is ignored build output; schema and migrations remain tracked.
Standalone build requires `DATABASE_URL` through the environment or `.env` for
Prisma configuration, but generation does not connect to the database.

Disposable test configuration is committed in `.env.test`; local development continues to use
`.env` or process environment variables.

When a public API changes intentionally:

```bash
pnpm generate:api-contracts
pnpm verify
```

To reproduce the complete CI and Sonar flow locally, Docker must be running.
Create the ignored `.env.sonar` file with the SonarCloud token:

```bash
SONAR_TOKEN=your-token
```

Then run:

```bash
pnpm ci:local:sonar
```

This scans the current pull request when one exists and fails on a mismatched
analysis revision, a failed quality gate, or any open Sonar issue.

Feature layout, CQRS, and pagination rules are in [REVIEW.md](REVIEW.md).
