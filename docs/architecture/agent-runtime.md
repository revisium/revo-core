# Agent runtime integration

The infrastructure `AgentRuntimeModule` creates and initializes one `AgentManager`. Dialogue
execution and Run composition use the same manager and discovered definitions. Runtime sessions,
turn handles, checkpoints, hibernation, and resume tokens are internal execution capabilities; Core
does not expose them as a parallel public chat API.

`AgentDefinitionsModule` exposes agent discovery and configuration inspection through a bus-only
feature API. It does not open runtime sessions. Dialogue commands own durable conversation
admission, idempotency, status, history, interactions, and client-facing subscriptions.

Shared runtime state has separate technical owners: active-state sinks, the durable event journal,
and session output directories in Core, and turn-handle retention in `revo-agent-runtime`. Runtime
events are durably recorded before the runtime receives acknowledgement, whether or not an SSE
client is connected.

Run shutdown closes admission, drains the agent runtime, stops DBOS, and then releases owned
resources. Unconfirmed execution shutdown retains working directories.

## Configuration

- `REVO_AGENT_WORKSPACE_ROOT`: runtime workspace; defaults to the user's `.revo/sessions`
  directory. It is independent of the temporary Run workspace root.
- `REVO_AGENT_INHERIT_ENV`: comma-separated environment variable allowlist; defaults to
  `HOME,PATH`. Add provider-specific variables only in deployment or local configuration. Core does
  not forward its entire environment.
- Dialogue creation persists the selected agent, catalog revision, and configuration selections.
  Runtime dispatch applies that persisted selection when it opens a session.

## Recovery boundary

Persistent Dialogue history and SSE cursors survive Core restart. Startup reconciliation marks
unfinished execution conservatively; stored messages alone do not resume an active provider turn.
The runtime package retains checkpoint, hibernation, resume, shutdown, and token-claim contracts for
internal orchestration. Removing the public session API does not weaken the journal's single-use
resume-token or predecessor validation guarantees.
