# Public application errors

Feature APIs report expected failures with `ApplicationError` contracts. A feature owns its stable code and typed details; it does not import transport modules or define HTTP status, GraphQL extensions, or public English text.

The API layer maps those contracts through `public-error-definitions.ts` and `public-error-response.ts`. The catalog preserves each existing status, code, message, path, field, details, and GraphQL placement. The projection creates fresh response objects and copies nested values from explicit allowlists. Unknown errors use a fixed internal response.

To add an error, a feature contract and the shared projection stay small and correlated:

```ts
export type WorkspaceErrorDetails = Readonly<{ field?: WorkspaceInputField }>;
throw new WorkspaceError('WORKSPACE_INVALID_INPUT', 'sourcePath');
```

Then add the exact definition and one explicit projection branch:

```ts
WORKSPACE_INVALID_INPUT: definition(400, 'Workspace input is invalid.'),
// public-error-response.ts copies only the optional field
```

To add an error:

1. Add a feature-owned code and correlated details type, then throw `new ApplicationError(code, details)` at the business boundary.
2. Add the exact status, message, compatibility metadata, and optional description to the API catalog.
3. Add the permitted payload fields and nested projection to the shared response mapper.
4. Add one REST and one GraphQL public contract case, including omitted versus null fields.

| Owner / code                                                               | Current REST / GraphQL response                                        | Payload                                      | Proposed mapping                                                    |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| Project: `PROJECT_NOT_FOUND`, `PROJECT_NOT_ACTIVE`, `PROJECT_NOT_ARCHIVED` | REST generic 404/409 envelope; GraphQL message only                    | empty                                        | Catalog keeps status/message and omits a new public code            |
| Project: `project_has_active_runs`                                         | REST and GraphQL include `/projectId` and `details.runIds`             | `runIds[]`                                   | Explicit nested copy plus additive remediation description          |
| Run: `run_selector_invalid`, `project_id_invalid`                          | REST and GraphQL structured path/details                               | selector variant, reason                     | Correlated application payload; catalog owns exact selector message |
| Run manager codes                                                          | REST `{statusCode,code,message,path,details}`; GraphQL full extensions | per-code allowlist                           | Closed library codes remain public; unknown errors are masked       |
| Workspace / FileSystem codes                                               | REST full body; GraphQL lean extensions                                | optional Workspace `field`; filesystem empty | Preserve code/status/message and originating filesystem shape       |
| AgentDefinitions cursor codes                                              | GraphQL extensions with explicit `path:null`; REST N/A                 | empty                                        | Shared projection preserves casing and GraphQL-only contract        |
