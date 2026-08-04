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

To reproduce the complete CI and Sonar flow locally, provide `SONAR_TOKEN` in
`.env.sonar` and run:

```bash
pnpm ci:local:sonar
```
