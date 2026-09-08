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
Disposable test configuration is committed in `.env.test`; local development continues to use
`.env` or process environment variables.

When a public API changes intentionally:

```bash
pnpm generate:api-contracts
pnpm verify
```

The default dialogue replay test crosses the 100-row reader batch boundary with
101 events. Run the full 10,050-event persistence and SSE replay stress scenario
separately when changing the dialogue journal, projection, or subscription path:

```bash
pnpm test:dialogue:stress
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
