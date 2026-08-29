# Review rules

- API transports call a feature API service, not CQRS buses or infrastructure directly.
- Features do not import transport API modules or another feature's persistence or infrastructure internals. Shared infrastructure providers and modules are allowed.
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
- A feature module exports its `*-api.service.ts` as its transport-agnostic application API. REST, GraphQL, jobs, CLI, and other features may consume it and explicitly designated public contract modules or files; they do not import another feature's handlers, message classes, or persistence internals.
- A feature API service contains no business or persistence behavior and dispatches only its own feature's commands and queries.
- A handler owns its use case and does not dispatch another command or query, call another handler, or recursively call its own feature API. It may call another feature's exported API when the dependency graph is acyclic and that API's consistency and error semantics fit the use case.
- Use synchronous feature API calls when the result is required; use events for fan-out or eventual work. A use case that requires one transaction or snapshot stays behind one explicit owning boundary.
- Do not add a repository or application-service layer that wraps what the handler should do.
- Add a narrow port only for an actual integration, lifecycle, or substitution need.
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
