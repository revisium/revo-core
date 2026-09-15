# Public application errors

Feature APIs report expected failures with feature-owned error classes. Each class carries one readonly discriminated `failure` value: its code selects the permitted details. These contracts import no transport modules, statuses, GraphQL extensions, or public English text.

The API has four mapping responsibilities:

- `known-application-error.ts` recognizes the nominal feature classes and returns their closed failure union. Generic `ApplicationError` instances and lookalike objects remain unknown.
- `public-error-definitions.ts` owns exact public messages, optional descriptions, statuses, compatibility codes, REST labels, and plain/lean/full GraphQL format.
- `public-error-payload.ts` explicitly copies permitted fields, arrays, and nested values. Its exhaustive switch narrows the correlated failure before reading details.
- `public-error-response.ts` combines the catalog and projected payload into paired transport envelopes. It preserves omitted properties, nulls, empty paths, and empty details.

The single global dispatcher recognizes and maps once, then selects the HTTP or GraphQL adapter. `ApplicationHttpExceptionFilter` owns HTTP replies and native HttpException, BadRequest, and JSON-parser compatibility, including existing validation arrays and `INVALID_REQUEST`. `ApplicationGraphqlExceptionFilter` owns GraphQLError construction, ordinary framework exception compatibility, and internal-error masking. GraphQL handling never accesses a native HTTP response. Feature handlers and resolvers register no competing filters. DTO and parser-only Project copy lives in `project-public-messages.ts`.

Run's library adapter validates untrusted library details once before constructing the typed failure. The narrow Catalog adapter converts only a 409 HttpException with the known corruption code, pipeline/profile path, and storage reason at Run's two Catalog reads. The standalone Catalog codec retains its existing exception contract; other Catalog failures propagate unchanged.

## Adding an error

For example, if a new approved Workspace operation needs to reject an unsupported source, add `sourceUnsupported` to the existing `WorkspaceErrorCode` object and its member to the existing details map in `features/workspace/contracts/workspace.errors.ts`:

```ts
export const WorkspaceErrorCode = {
  // Existing members remain here.
  sourceUnsupported: 'WORKSPACE_SOURCE_UNSUPPORTED',
} as const;

export type WorkspaceErrorDetails = {
  // Existing members remain here.
  [WorkspaceErrorCode.sourceUnsupported]: { readonly field: 'sourcePath' };
};
```

The existing `WorkspaceErrorCode` union, mapped `WorkspaceFailure`, and `WorkspaceError` class automatically include the member. At the owning business condition, import the contract and throw the complete failure:

```ts
import { WorkspaceError, WorkspaceErrorCode } from '../contracts/workspace.errors.js';

throw new WorkspaceError({
  code: WorkspaceErrorCode.sourceUnsupported,
  details: { field: 'sourcePath' },
});
```

In `api/errors/public-error-definitions.ts`, use its existing `WorkspaceErrorCode` import to add the complete presentation entry. `publicCode` is explicit: omitting it deliberately omits the wire code.

```ts
[WorkspaceErrorCode.sourceUnsupported]: {
  status: 400,
  message: 'Workspace source is unsupported.',
  publicCode: WorkspaceErrorCode.sourceUnsupported,
  graphql: 'lean',
},
```

In `api/errors/public-error-payload.ts`, use the same imported constant and add the allowed field to its switch:

```ts
case WorkspaceErrorCode.sourceUnsupported:
  return { field: failure.details.field };
```

Add a mixed-transport vector with the complete REST body `{ statusCode: 400, code: 'WORKSPACE_SOURCE_UNSUPPORTED', message: 'Workspace source is unsupported.', field: 'sourcePath' }` and GraphQL extensions `{ statusCode: 400, code: 'WORKSPACE_SOURCE_UNSUPPORTED', field: 'sourcePath' }`. The example adds no `path`, `details`, or extension `message`. Add the operation's behavioral test and regenerate schema artifacts only if their public shape changes. Recognition, envelope construction, adapters, and registration need no changes for a new code in an existing feature. The compiler requires both the catalog entry and payload case.

## Migrated contracts

| Owner                          | Preserved presentation                                                                                                            | Payload ownership                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Ordinary Project failures      | REST labels and existing `INVALID_REQUEST` where applicable; GraphQL message only                                                 | Empty feature details; no new public Project codes                                             |
| Project active runs            | Existing message/code and `/projectId`; optional remediation description in both transports                                       | Ordered copy of `details.runIds`                                                               |
| Run local and library failures | REST body and full GraphQL extensions include message, path, and details; allocation conflict keeps its uppercase public override | Per-code fields, nullable values, empty details, and explicit nested diagnostic/attempt copies |
| Workspace / FileSystem         | REST message; lean GraphQL extensions; sanitized filesystem IO failure remains public                                             | Optional Workspace field; no invented path/details; filesystem origin is preserved             |
| AgentDefinitions cursors       | Lean GraphQL extensions with `path: null`; no production REST endpoint                                                            | No fabricated details or extension message                                                     |
| Catalog corruption through Run | Existing corruption code/message, 409, pipeline/profile path, and storage reason                                                  | Catalog-owned narrow failure; standalone producer unchanged                                    |
