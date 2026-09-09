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

## Test design

- Verify one observable behavior per test. Several assertions may establish that behavior;
  split unrelated failure and lifecycle scenarios.
- Keep actions and assertions at one abstraction level. Domain tests use domain fixtures that
  hide HTTP/SSE setup, IO, and timing; transport tests may inspect HTTP/SSE contracts directly.
- Every test must distinguish a plausible broken behavior. Prefer public outcomes over private
  state, call wiring, or assertions that merely restate the implementation.
- Cover our contracts, adapters, and regressions. Do not retest generic library behavior or repeat
  a happy path across layers without a distinct integration risk.
- Reuse existing test boundaries. Keep related single-suite helpers together; extract a helper
  only for meaningful reuse or a substantial responsibility. Avoid assertion-wrapper DSLs that
  hide the expected result.
