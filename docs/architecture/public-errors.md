# Public application errors

Feature contracts own structured client failures using `PublicHttpException`, a small Nest
`HttpException` subclass. Each constructor selects the public status, code, message and permitted
fields. Feature messages live in `contracts/errors.en.ts`. These application contracts may depend
on Nest; domain code remains independent of them and of API adapters.

REST keeps the existing global filter and delegates prepared responses to Nest. GraphQL resolvers
use `PublicHttpExceptionFilter`, with one of two projections:

- `response`: the complete public body, including message and details.
- `minimal`: code, statusCode, and present field/path/description; no message or details duplication.

The base omits absent fields and preserves null and empty values. Owning constructors detach
caller-owned nested payloads once. Run's installed library JsonObject diagnostics remain supported
public data, with only root path extracted separately.

## Example

`ProjectHasActiveRunsError(runIds)` supplies status 409, code `project_has_active_runs`,
`ProjectError.hasActiveRuns`, path `/projectId`, and `{ runIds: [...runIds] }`. It selects
`response`, so REST and GraphQL expose the same prepared fields. The archive handler throws it at
the existing blocking-run condition. Adding another error needs only its feature declaration,
text, throw site and behavior test; no central registration or feature-specific filter.

## Internal failures

Yoga's supported maskError hook preserves privately marked shared-filter errors and intentional
native BadRequest/NotFound/Conflict/Unauthorized/Forbidden messages. Generic HttpException,
unknown failures and unmarked resolver GraphQLError are masked as `Unexpected error.` with
`INTERNAL_SERVER_ERROR`. Wrapper messages/extensions cannot replace trusted public content.
Installed engine parse/validation/coercion errors retain their native pre-execution behavior.
REST masks generic exceptions and disables Nest's duck-typed public-object handling while retaining
Nest's unknown-error reporting. Its native validation normalization and registration remain intact.

Ordinary native Project errors retain their classes for Run reservation consumers. Explicit public
500/503 errors stay public. SSE subscribe/iterator/cleanup handling retains its existing owners.
The narrow Catalog corrupt-definition constructor is public, while its standalone resolver remains
outside the shared filter and returns its existing plain GraphQL message.

The dialogue delivery-failure test previously exposed an internal controlled failure message; it
now expects the safe generic message while retaining its persistence assertions. This is the
approved internal-message safety change, not a change to delivery or recovery behavior.

See the [accepted proposal](public-errors-nest-proposal.md) for compatibility and verification rules.
