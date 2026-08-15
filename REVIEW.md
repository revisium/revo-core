# Review rules

- API transports call a feature API service, not CQRS buses or infrastructure directly.
- Features do not import API or infrastructure modules.
- Commands and queries declare their input and result types next to the message.
- CQRS return types use the `CommandReturnType` or `QueryReturnType` suffix.
- GraphQL and REST transport models live in a local `model/` directory.
- Use `@ObjectType()` without a custom label unless the public type name must differ.
- Application code reads environment variables through `ConfigService`.
- Read package metadata from `package.json`; do not duplicate it as literals.
- Decorators and the declarations they describe use separate lines.
- Do not use non-null assertions.
- Every control-flow body uses braces.
- Add dependencies only for current behavior.
- Prefer public contract tests over tests of framework wiring or trivial delegation.
- Put a blank line before `if`, `for`, `while`, `do`, `switch`, `try`, and `return` when they start a new statement. Oxlint has no `padding-line-between-statements` rule, so this is reviewed here.

## Feature and CQRS layout

- A feature is `commands/`, `queries/`, `*-api.service.ts`, and `*.module.ts`.
- The feature API service only executes commands and queries on the bus.
- The handler owns the use case: validate, read and write persistence, map the result. Split steps into private methods on that handler.
- A handler does not execute another command or query. It loads whatever it needs from Engine or Prisma itself.
- Do not add a repository or application-service layer that wraps what the handler should do.
- Extra injectables are only for a different process or lifecycle, not for ordinary use-case steps.
- Shared value-level checks may be pure functions. Extract them only when more than one handler uses them.

## Pagination

List reads use cursor pagination. Do not invent a second paging model.

- Query data takes `first` and optional `after`.
- The return type is `IPaginatedType<T>`: `edges`, `totalCount`, `pageInfo` (`startCursor`, `endCursor`, `hasNextPage`, `hasPreviousPage`).
- The handler forwards `first` / `after` to the persistence list API and maps `edges[].node`. Do not reimplement paging.
- GraphQL list fields return a `Paginated(Model)` connection and take `first: Int!` plus optional `after`.
- REST list endpoints take `first` and `after` as query parameters and return the same connection body. Default `first` is 100; maximum is 1000.
- Paginate list reads only. Get-one and single-resource writes are not paginated.

Promote repeated objective review findings to Oxlint, Oxfmt, or focused contract tests.
Keep contextual design guidance here instead of building custom static analyzers.
