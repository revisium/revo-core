# Project run ownership

Each newly admitted Run has one active user Project. Core stores that ownership in
`ProjectRun` before it asks the Run Manager to admit execution. Run state, attempts,
events, and terminal outcomes remain owned by the Run Manager.

Core does not backfill historical Runs. A Run without a `ProjectRun` row remains
readable and reports `projectId: null`.

Archiving a Project checks each linked Run. A nonterminal Run, an unresolved
reservation, or an unavailable runtime observation prevents archival. This keeps
ownership safe when admission is ambiguous, but a process failure after reserving
ownership can leave a Project unavailable for archival until the Run Manager can
report a terminal result.

When archival is rejected because a linked Run is nonterminal or its reservation
is unresolved, REST returns HTTP 409 and GraphQL returns the same structured
fields in `errors[].extensions`: code `project_has_active_runs`, message `Project
has active runs.`, and `details.runIds`. Clients use those IDs to direct users to
their existing Run views or API flow. Observation failures preserve the Project
but retain their original error semantics.

## Listing a project's Runs

The Run list is scoped to one user Project. GraphQL exposes
`runs(data: RunListInput!): RunConnection!`; REST exposes
`GET /api/runs?projectId=<id>&statuses=running,pending&first=20&after=<cursor>`.
`projectId` is required. The response is the shared connection shape with
`edges`, `totalCount`, and `pageInfo`. Existing start, get-one, details, and
events operations retain their contracts, including `projectId: null` for a
legacy Run without a `ProjectRun` row.

The optional `statuses` filter uses AND with the project and OR within the
array. The accepted values are `pending`, `running`, `cancelling`,
`recovery_required`, `succeeded`, `failed`, and `cancelled`. An omitted filter
matches every observed Run; an empty array matches none. Unknown or duplicate
values, a malformed array, or an empty REST `statuses` value is a bad request.
REST receives one comma-separated string and converts it to the array used by
feature validation. `first` and `after` use shared cursor pagination: `first`
defaults to 100 and must be an integer from 1 through 100, while `after` is
opaque.

Runs are ordered by `createdAt` descending and then `runId` ascending. The
reader obtains the Project's reservation IDs in a repeatable-read transaction,
completes that transaction, and then reads each runtime snapshot once in
sequence. It removes missing snapshots, applies the status filter, sorts the
complete observed set, and computes the page, count, and pageInfo from that
same materialized array. Materialization therefore costs O(N) runtime reads
and O(N) memory for the project's reservations. A runtime read error fails the
whole request; no partial page or count is returned.

This is a consistent result within one request, rather than an atomic snapshot
across Core and the Run Manager. A new reservation or status change between
requests can move an offset cursor. Cursors do not encode a snapshot or filter;
clients reset `after` when the project, status filter, or list refresh changes.
With unchanged data, paging is stable and does not skip or repeat Runs.

Overview and the archive dialog define active Runs as exactly `pending`,
`running`, `cancelling`, and `recovery_required`, passed through the ordinary
list filter. There is no separate active endpoint. An unavailable runtime
snapshot is omitted and does not count as a synthetic pending Run. An empty
active result still does not authorize archival: unresolved reservations and
races remain governed by the authoritative archive command, which can return
`project_has_active_runs` with `details.runIds`.
