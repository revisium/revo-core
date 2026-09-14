# Workspace API flows

Workspaces connect local folders or Git working trees to a Project. Their metadata
is independent of the files on disk: creating, editing, archiving, or restoring a
Workspace does not create or delete its source directory. The same source may be
connected more than once, including within one Project.

## Selecting and checking a source

Use the Filesystem API to browse local directories. Before saving a Workspace,
call `POST /api/workspaces/check-source` with `type` and `sourcePath`, or the
GraphQL `checkWorkspaceSource(data: WorkspaceSourceInput!)` mutation. No Project
or Workspace ID is required.

The result contains `availability` and nullable `errorCode`. It distinguishes an
available source, a missing source, a file where a directory is required, access
denied by the operating system, invalid Git metadata, and a failed check. A
missing source is an observation returned with HTTP 200; invalid input is HTTP 400. Checking a source never persists a Workspace or changes the source files.

Saving metadata remains possible when the source is unavailable. The interface
should show the check result as a warning and let the user correct the path or
save deliberately. A successful check is a point-in-time observation; the source
may change afterwards. For an existing active Workspace, use its `check` endpoint
or GraphQL `checkWorkspace` to check the stored path again.

## Creating and editing

`POST /api/projects/:projectId/workspaces` and GraphQL `createWorkspace` return
the full Workspace, including `id`, normalized values, timestamps, `isArchived`,
and `archivedAt`. Updates through `PATCH` or `updateWorkspace` return the same
model. The client can use the returned model immediately instead of issuing a
second get request.

After a mutation, refresh affected lists and Project summaries. Their ordering,
counts, and first-three previews can change even when the returned Workspace is
already present in the client cache. Start pagination again after changing its
filter or invalidating a list following a mutation.

## Archive and recovery

Normal Workspace lists include active rows only. Set `includeArchived=true` in
REST or the GraphQL list input to include archived rows in the same paginated
connection. Project summaries always count and preview active Workspaces only.
An archived Workspace remains available by ID.

Archive through `POST /api/projects/:projectId/workspaces/:id/archive` or
GraphQL `archiveWorkspace`. Restore through the corresponding `restore` endpoint
or `restoreWorkspace`. Both return the full Workspace. Repeating an operation
that has already reached its target state returns the current model and keeps
its timestamps unchanged, making retries safe after a lost response.

Restoring sets `isArchived` to false and clears `archivedAt`. It does not require
the source directory to exist. The recovery flow is:

1. Find the Workspace with `includeArchived=true` or open its direct link.
2. Restore its metadata and display the returned active record.
3. Check the source. If the folder has been removed, show `NOT_FOUND` and offer
   to change the path.
4. Save a replacement path and check it again.

Updating or checking a still-archived Workspace returns `WORKSPACE_ARCHIVED`.
An archived Project permits reading its Workspaces but blocks Workspace
mutations, including archive and restore, until the Project is restored.

## Errors in forms

Feature validation failures return `WORKSPACE_INVALID_INPUT` with an optional
`field` such as `name`, `description`, `type`, or `sourcePath`. REST includes it
in the JSON error body; GraphQL includes it in the error extensions alongside
`code` and `statusCode`. Use it to associate the error with the form field while
keeping the user's entered values.

Generic HTTP bad requests, including malformed JSON, use `INVALID_REQUEST`
when no feature error code exists. They may have no field, so the interface
should also support a form-level error. Errors caught by GraphQL's own schema
validation retain the standard GraphQL validation response.
