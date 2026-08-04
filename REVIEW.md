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

Promote repeated objective review findings to Oxlint, Oxfmt, or focused contract tests.
Keep contextual design guidance here instead of building custom static analyzers.
