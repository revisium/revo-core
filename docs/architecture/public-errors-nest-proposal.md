# Feature-owned public errors using Nest

Status: Accepted for implementation

Version: 2

This migration is authorized for the isolated Nest public-errors implementation.
It replaces the earlier transport-free proposal for this work item; it does not
claim that implementation or verification is complete.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, MAY, REQUIRED, and OPTIONAL
are interpreted following RFC 2119 and BCP 14.

## Decision proposed

Use a small public exception base extending Nest `HttpException`, feature-local
error declarations, existing Nest REST handling, and one shared GraphQL adapter.
Do not create a central registry of every business error.

This deliberately permits Nest and HTTP metadata in public application contracts.
It does not permit domain policies to depend on public HTTP exceptions. A feature
API remains independent of controllers and resolvers, but its error boundary is
not framework-neutral.

Retaining master unchanged is a viable fallback. The proposed change is justified
only if it removes feature-specific filters without introducing a larger system
of registries, payload switches, or intermediate error models.

## Baseline evidence (informative)

The inspected baseline is `origin/master` at
`87419c7a060d986a99e0fcde47a0df33961666d9`, including Project archival PR #42.
The live remote reference matched this SHA during planning. Source was read from
this revision, not the older refactor checkout or paused partial implementation.

Relevant versions are Nest 11.1.28, `@nestjs/graphql` 13.4.2,
`@graphql-yoga/nestjs` 3.22.2, GraphQL 16.14.2, and
`@revisium/revo-run` 0.2.0-alpha.6.

The product documents in revo-docs describe shared operations across UI, MCP,
REST, and GraphQL. REQ-001 and REQ-002 are drafts; REQ-007 is a proposal. They
support common operation semantics, but do not prescribe identical envelopes or
a particular exception hierarchy.

Nest supports object responses in custom HttpException subclasses. GraphQL
filters return errors rather than writing the native HTTP response:
[Nest exception filters](https://docs.nestjs.com/exception-filters) and
[Nest GraphQL filters](https://docs.nestjs.com/graphql/other-features).

## Target migration

### Responsibilities

| Location                                                           | Responsibility                                                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `src/infrastructure/errors/public-http-exception.ts`               | Small framework-bound base; closed public response fields and finite GraphQL projection metadata |
| Existing feature `contracts/*.errors.ts` or `file-system.error.ts` | Codes, statuses, named errors or compact error families, permitted payload construction          |
| Feature `contracts/errors.en.ts`                                   | English messages and optional descriptions; ordinary objects, no locale infrastructure           |
| Handlers                                                           | Existing business conditions, transactions, and throwing named errors                            |
| Existing Run integration mapper                                    | Recognize library errors, preserve mapping and diagnostic policy                                 |
| `src/api/graphql/public-http-exception.filter.ts`                  | Shared serialization of prepared public errors                                                   |
| Existing REST bad-request filter                                   | Existing validation normalization and delegation to Nest                                         |

Feature code MUST NOT import the API layer. Domain code MUST NOT import the new
public HTTP exception base. Public exception construction belongs at the
application or integration boundary.

Existing contract paths MUST be preserved. A new Run contract file MAY be added
at `src/features/run/contracts/run.errors.ts`. Small error families MAY keep one
class and a local table; a class or file per code is not required.

Ordinary native Project exceptions MUST remain native unless a particular
structured public contract requires migration. No business codes may be invented
merely to fit the new base.

### Public response

The base will extend HttpException and construct a fresh response containing only:

```text
statusCode, code, message, description?, path?, field?, details?
```

The HTTP status MUST equal the prepared response's `statusCode`.
`path` permits a string or explicit null. Omitted optional fields MUST remain
absent. `field` MUST NOT be renamed to `path`.

The base MUST NOT accept an arbitrary exception as a response. Feature
constructors MUST explicitly select their public payload fields. JSON typing or
cloning alone MUST NOT be treated as proof that data is safe to publish.

Internal stacks, causes, provider objects, and unrelated diagnostic context MUST
NOT be copied into public responses. Public nested data MUST be detached from
mutable caller-owned objects without introducing redundant cloning layers.

Messages MUST preserve baseline values. Descriptions are optional additive fields.
If a description is added for `project_has_active_runs`, it MUST cover both active
Runs and unresolved reservations. Dynamic run IDs MUST remain structured data.

### GraphQL compatibility

Use two finite projections, recorded on the public exception outside its HTTP
body:

| Projection | Extensions                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------ |
| `response` | Prepared public response, including message and present payload fields                           |
| `minimal`  | code, statusCode, present field/path, and optional description; no duplicated message or details |

The shared adapter MUST NOT import feature error classes. It MUST NOT branch on
business codes or feature names. It MUST NOT revalidate handler-produced payloads.
It MUST NOT spread arbitrary HttpException responses.

Bind the shared filter to the existing five resolver surfaces using Nest's
existing resolver filter mechanism. Do not install a second competing global
catch-all filter. Existing REST registration remains unchanged.

The GraphQL exception's outer message will use the prepared message. GraphQL's
own error path remains distinct from `extensions.path`. The adapter MUST NOT set
the operation's HTTP response status from an individual resolver error.

Adding an error with an existing projection MUST NOT require editing the adapter.
Adding an entirely new resolver surface can require ordinary filter wiring.

## Migration inventory

Tables describe the baseline to preserve. Full responses contain statusCode,
code, message, path, and details; minimal GraphQL extensions omit message. Exact
current throw sites and public tests remain the authority for native validation
arrays and dynamic library payload values.

### Project

| Cases                                                            | Status / code                                    | Existing representation                                                         | Action                                 |
| ---------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------- |
| Active Runs or unresolved reservations                           | 409 / `project_has_active_runs`                  | Full; message `Project has active runs.`; path `/projectId`; details `{runIds}` | Local typed public error               |
| Missing Project                                                  | 404, native                                      | `Project was not found.`                                                        | Keep native                            |
| Inactive Project                                                 | 409, native                                      | `Project is not active.`                                                        | Keep native                            |
| Project not archived                                             | 409, native                                      | `Project is not archived.`                                                      | Keep native                            |
| Missing name, invalid description, invalid update body/record ID | Native 400; REST normalization `INVALID_REQUEST` | Existing strings or validation arrays                                           | Keep native validation                 |
| Missing record                                                   | Native 404 where thrown                          | `Record was not found.`; nullable successful reads remain nullable              | Keep existing distinction              |
| Initial commit/content migration failure                         | Existing internal exception                      | Internal failure, not a newly public business error                             | Apply internal disclosure policy below |

The Run reservation converter recognizes native Project NotFoundException and
ConflictException. These checks MUST retain their meaning.

### Workspace

All use minimal GraphQL extensions; optional `field` is top-level in both
transports and remains absent when omitted.

| Code                          | Status | Message                                      |
| ----------------------------- | ------ | -------------------------------------------- |
| `WORKSPACE_NOT_FOUND`         | 404    | Workspace was not found in this Project.     |
| `WORKSPACE_PROJECT_NOT_FOUND` | 404    | Project was not found.                       |
| `WORKSPACE_PROJECT_ARCHIVED`  | 409    | Workspace changes require an active Project. |
| `WORKSPACE_ARCHIVED`          | 409    | Workspace is archived.                       |
| `WORKSPACE_INVALID_INPUT`     | 400    | Workspace input is invalid.                  |

Existing field values include name, description, type, sourcePath, and
includeArchived. Source availability remains a successful check result; it MUST
NOT be converted into a thrown exception.

### FileSystem

All use minimal GraphQL extensions without field, path, or details.

| Code                         | Status | Message                                        |
| ---------------------------- | ------ | ---------------------------------------------- |
| `FILE_SYSTEM_NOT_FOUND`      | 404    | Filesystem entry was not found.                |
| `FILE_SYSTEM_NOT_DIRECTORY`  | 400    | Filesystem entry is not a directory.           |
| `FILE_SYSTEM_ACCESS_DENIED`  | 403    | The operating system denied filesystem access. |
| `FILE_SYSTEM_ALREADY_EXISTS` | 409    | Filesystem entry already exists.               |
| `FILE_SYSTEM_INVALID_PATH`   | 400    | Filesystem path is invalid.                    |
| `FILE_SYSTEM_INVALID_NAME`   | 400    | Directory name is invalid.                     |
| `FILE_SYSTEM_TOO_LARGE`      | 413    | Filesystem text exceeds the supported size.    |
| `FILE_SYSTEM_IO_ERROR`       | 500    | Filesystem operation failed.                   |

Existing OS error classification MUST remain unchanged. Raw OS messages and
internal paths MUST NOT be published by this conversion.

### AgentDefinitions

| Code                                | Status | Message                                                |
| ----------------------------------- | ------ | ------------------------------------------------------ |
| `REVO_AGENT_SESSION_INVALID_CURSOR` | 400    | Agent definition cursor is invalid.                    |
| `REVO_AGENT_SESSION_EXPIRED_CURSOR` | 404    | Agent definition cursor belongs to an earlier process. |

Both use minimal GraphQL extensions with explicit `path: null`. There is no
existing REST controller for this feature; no new endpoint is implied.

### Run

Core-owned failures all use full responses:

| Code                   | Status | Message / payload                                                                                                                       |
| ---------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `run_selector_invalid` | 400    | Exactly one pipeline selector is required. / Exactly one profile selector is required.; path `/pipeline` or `/profile`; existing reason |
| `project_id_invalid`   | 400    | Project ID is required.; path `/projectId`; reason required                                                                             |
| `project_unavailable`  | 404    | Project was not found.; path `/projectId`; empty details                                                                                |
| `project_archived`     | 409    | Project is not active.; path `/projectId`; empty details                                                                                |

Library mapping stays in the existing
`src/features/run/run-manager-error.mapper.ts`. Preserve these groups:

| Status | Library codes                                                                                                                                                                                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | invalid_create_run_input, invalid_list_runs_filter, invalid_run_event_page_input, invalid_run_event_subscription_input, invalid_run_id, invalid_wait_for_terminal_input, run_event_cursor_invalid, run_gate_answer_invalid, run_gate_payload_invalid, run_signal_invalid, run_signal_payload_invalid |
| 403    | run_gate_unauthorized                                                                                                                                                                                                                                                                                |
| 404    | run_gate_not_found, run_not_found, run_wait_not_found                                                                                                                                                                                                                                                |
| 409    | run_gate_already_resolved, run_recovery_required, run_wait_already_resolved                                                                                                                                                                                                                          |
| 422    | pipeline_compilation_failed, run_profile_invalid, run_requirement_unresolved                                                                                                                                                                                                                         |
| 503    | agent_runtime_unavailable, manager_not_started, manager_start_failed, manager_stop_failed, run_admission_failed, run_event_subscription_failed, run_id_conflict, run_interaction_failed, run_read_failed, run_wait_aborted                                                                           |
| 504    | run_wait_timed_out                                                                                                                                                                                                                                                                                   |

Accepted library codes and messages MUST remain unchanged except the existing
`run_id_conflict` override: `RUN_ID_ALLOCATION_CONFLICT`, message
`A run ID could not be allocated.`, empty details, existing path extraction.
Existing reportable mappings and redacted diagnostic calls MUST remain unchanged.

The mapper extracts string `details.path`, otherwise null, and removes only that
root property from the published library details. Empty-string paths are valid.
The malformed profile envelope retains `invalid_create_run_input`, path `''`,
and reason `invalid_envelope`.

Supported public JSON from the recognized library error is an existing contract.
The migration MUST NOT recreate its schema in a large per-code payload switch.
It MUST NOT publish unrelated properties of the library exception. Further
restriction of supported diagnostic keys would be a separate contract decision.

### Necessary Catalog dependency

Run also exposes `catalog_definition_corrupt` propagated by
`src/features/playbook-catalog/engine/catalog-record.codec.ts`: status 409,
message `Catalog definition is corrupt.`, path `/pipeline` or `/profile`,
details `{reason: 'storage_json'}`, full projection.

The proposed minimum is a narrow public-constructor change owned by Catalog,
preserving its current contracts file exports. Standalone Catalog resolver scope
MUST remain unchanged. Tests MUST preserve its own behavior as well as the Run
propagation path. This is an explicit sixth-owner dependency, not authorization
to migrate all Catalog errors.

The alternative is conversion at Run's boundary. That requires additional
recognition of Catalog's representation; choose it only if the producer change
cannot preserve standalone behavior.

## Internal errors: required safety and deliberate behavior change

The installed Yoga driver defaults `maskedErrors` to false, and baseline Core
does not override it. There is no evidence of blanket query/mutation masking on
master. Consequently, preserving all current internal GraphQL messages and
guaranteeing non-disclosure are not compatible goals.

The original non-disclosure requirement remains REQUIRED. Unknown/internal
exceptions MUST NOT disclose stacks, causes, or implementation details. Previously
exposed internal query/mutation messages will therefore require a deliberate
behavior change. Known public contracts, including supported native Project
errors and explicit public 500/503 errors, MUST remain distinguishable from
unknown internal failures; status alone is not a safe discriminator.

### Resolved Yoga masking integration

Use the installed YogaDriver `maskedErrors` option with a custom `maskError` and
`isDev: false`. The Nest adapter currently defaults masking to false; explicitly
configure the supported hook. No second global Nest filter is introduced.

The shared GraphQL adapter marks its prepared errors with private in-process
identity. The mask hook follows GraphQLError `originalError` wrappers, preserving
only a marked prepared representation or an intentional native public exception.
It reconstructs outer path/locations from GraphQL and public content from the
trusted source; arbitrary wrapper messages/extensions do not become public.
Traversal MUST terminate for a cyclic wrapper chain.

Native BadRequestException, NotFoundException, ConflictException,
UnauthorizedException, and ForbiddenException constructors signify an intentional
public client-error message in the existing application contract. Preserve their
outer messages; do not publish their arbitrary response properties or causes.
This convention does not declare every status below 500, every HttpException,
or every GraphQLError public. Generic HttpException, InternalServerErrorException,
unknown Error/object, and unmarked resolver GraphQLError are masked. Explicit
PublicHttpException instances remain public even at status 500 or 503.

Installed GraphQL 16.14.2 produces variable coercion/operation-selection failures
before field execution, without resolver paths, and attaches a resolver path via
locatedError to execution failures. Yoga supplies parse/schema validation errors
at its pre-execution boundary. Preserve these native pre-execution errors;
pathless shape alone is not a general trust rule for arbitrary application data.
Tests MUST cover coercion, forged resolver GraphQLError codes, nested originalError
wrappers, and malicious wrapper extensions. Unknown execution failures use the
safe message `Unexpected error.` and INTERNAL_SERVER_ERROR without originalError
extensions, including in development mode.

REST retains its current registration and native validation normalization. Its
existing filter delegates declared public and intentional native client exceptions
to Nest, while generic/technical exceptions receive the safe internal response.
Do not pass arbitrary public-looking objects to Nest's duck-typed unknown-error
path. This is the same documented internal-disclosure safety change as GraphQL.

The supported hook is documented in [Yoga error masking](https://the-guild.dev/graphql/yoga-server/docs/features/error-masking).
The installed implementation was checked in @graphql-yoga/nestjs 3.22.2,
graphql-yoga 5.22.0, and graphql 16.14.2 before selecting this integration.

Existing SSE subscribe/iterator/cleanup boundaries retain their separate owners
and safe fallback. Resolver filters MUST NOT be assumed to catch iterator errors.

## Adding an error (informative)

A named feature error constructs its code, status, text, and permitted fields.
For example, ProjectHasActiveRunsError takes runIds and creates details containing
only a detached copy of that list. Its projection is response. The handler throws
it at the existing archive-rejection site.

The handler's condition is intentionally not rewritten in this example: active
Runs, unknown snapshots, and unresolved reservations continue to block according
to existing rules. An empty runIds array MUST NOT imply that archive is permitted.

For an error of an existing response form, edit only:

1. The owning feature's error declaration.
2. Its text entry if the feature uses errors.en.ts.
3. The owning throw/conversion site.
4. Public behavior tests.

No central registration, serializer switch, global union, or new filter is needed.

## Ordered implementation stages

The safety gate above is resolved and this implementation is authorized.
Implementation proceeds in this order. Tests are
written alongside the implementation; required checks run after implementation
and documentation are complete, matching the requested workflow.

| Stage | Deliverable                                                         | Acceptance                                                                                                                |
| ----- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1     | Freeze public vectors in existing test boundaries                   | Codes, exact messages, statuses, projections, absent/null/empty paths, native cases, and Catalog propagation are explicit |
| 2     | Base and shared GraphQL adapter; Project and Workspace migration    | No per-code registration or adapter feature branches; no business-condition changes                                       |
| 3     | FileSystem, AgentDefinitions, Run and narrow Catalog dependency     | Existing error families and external library contract preserved; five replaced filters removed                            |
| 4     | Approved internal-error policy                                      | Unknown/internal non-disclosure proven without breaking known public and validation responses                             |
| 5     | Review rules and short architecture document with new-error example | Documentation acknowledges HTTP coupling and exactly matches implementation                                               |
| 6     | Required verification                                               | All declared checks pass; unavailable/failed checks reported honestly                                                     |

Verification MUST cover both transports in the same application; active Run
blocks archival; terminal Run permits it; unresolved reservation and concurrent
admission cannot bypass protection; definitive admission rejection releases its
reservation; ambiguous failures preserve it; cleanup/reporting remain unchanged.

Use existing transport and feature boundaries, including
`test/cri-run-public-contract.test.ts`,
`test/features/run/run-error-diagnostics.test.ts`,
`test/project-run-ownership.test.ts`, and
`test/archive-user-project-handler.test.ts`. Add no tests of trivial delegation.

Required baseline commands:

```sh
pnpm db:test:up
pnpm db:test:migrate
pnpm verify
pnpm db:test:down
```

Run repository API generation only when a public schema intentionally changes;
do not regenerate artifacts to hide a regression. Description additions require
their own assertions. Follow VERIFICATION.md for applicable additional checks;
subscription stress is required if subscription paths change.

## Proposed rule replacement

> Structured public application errors are declared in their owning feature's
> public contracts using the shared Nest exception base. Those contracts own
> codes, statuses, text, and explicitly permitted payloads. REST uses Nest's
> existing exception handling; the shared GraphQL adapter serializes the declared
> public representation without feature branches or business checks. Domain code
> remains independent of public HTTP exceptions. Changes preserve existing public
> contracts and verify internal-error safety through transport tests.

On acceptance this replaces the earlier prohibition of HTTP metadata in public
application errors and the requirement for a central API catalog. It does not
weaken payload safety, native validation, transaction ownership, or compatibility.

## Implementation boundary

The approved architecture is the small Nest-based migration with the resolved
masking policy above. No new dependencies, generalized registries, locale systems,
domain wrappers, or broad technical-exception migrations are in scope.
