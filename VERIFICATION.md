# Verification

Run before requesting review:

```bash
pnpm verify
```

This checks formatting, TypeScript, Oxlint, build, GraphQL and OpenAPI contracts,
transport smoke tests, and produces the LCOV report consumed by Sonar.

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
