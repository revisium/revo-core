# Review rules

- The rationale and target layout for feature boundaries are documented in
  [Feature modules](docs/architecture/feature-modules.md).
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

- A feature module exports its `*-api.service.ts` as its transport-agnostic application API. Transports, jobs, CLI entrypoints, and other feature modules may consume that API through the imported module.
- Cross-feature consumers may import only the module, API service, and explicitly public contracts. They do not import another feature's handlers, command or query messages, persistence internals, or transport adapters.
- Feature dependencies are acyclic. An API facade is bus-only and dispatches only its feature's commands and queries; it contains no business or persistence behavior.
- A handler owns one use case. It does not call another handler, recursively call its own API, or dispatch another command or query. It may synchronously call another feature's exported API when its result and error semantics fit the use case.
- Use events for fan-out or eventual work. A use case that requires one transaction or snapshot has one explicit owner and boundary.
- Keep the feature root limited to its module, API facade, and optional explicitly public entrypoint. Put implementation in truthful responsibility directories; do not create `utils`, `helpers`, `common`, `shared`, `constants`, or `types` dumping grounds.
- Domain code imports only feature contracts or domain code. It does not import Nest, HTTP, Engine, Prisma, DBOS, or transport code.
- Trust TypeScript inside typed boundaries. Validate and narrow values at untrusted transport, persistence, library, file, and JSON boundaries, before mutation. Each invariant has one validation owner.
- Hide storage shapes behind the typed module API. Keep direct dependencies explicit, use public package exports, and do not deep-import dependency internals.
- Do not retain legacy or dead code. Regenerate committed artifacts only through the repository generator, and keep README descriptions at product level.
- Do not add a repository, port, or application-service wrapper unless a current persistence, integration, lifecycle, transaction, or substitution boundary requires it.

## Pagination

List reads use cursor pagination. Do not invent a second paging model.

- Query data takes `first` and optional `after`.
- The return type is a feature-owned page contract with `edges`, `totalCount`, and `pageInfo` (`startCursor`, `endCursor`, `hasNextPage`, `hasPreviousPage`).
- The handler forwards `first` / `after` to the persistence list API and maps `edges[].node`. Do not reimplement paging.
- GraphQL list fields return a `Paginated(Model)` connection and take `first: Int!` plus optional `after`.
- REST list endpoints take `first` and `after` as query parameters and return the same connection body. Default `first` is 100; maximum is 1000.
- Paginate list reads only. Get-one and single-resource writes are not paginated.

Promote repeated objective review findings to Oxlint, Oxfmt, or focused contract tests.
Keep contextual design guidance here instead of building custom static analyzers.
