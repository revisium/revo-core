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
