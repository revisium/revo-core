# Agent runtime integration

The infrastructure AgentRuntimeModule creates and initializes one AgentManager.
AgentSession handlers consume that manager directly. Run composition creates its
attempt adapter from the same manager and discovered definitions; it does not
depend on the AgentSession feature.

Handlers own use cases. Shared state has separate owners: active-state sinks,
the event journal, turn-handle retention, and session output directories.
Run shutdown closes admission, drains the agent runtime, stops DBOS, and then
releases owned resources. Unconfirmed execution shutdown retains working
directories.

## Configuration

- REVO_AGENT_WORKSPACE_ROOT: session workspace; defaults to the user's .revo/sessions directory. It is independent of the temporary Run workspace root.
- REVO_AGENT_INHERIT_ENV: comma-separated environment variable allowlist; defaults to HOME,PATH. Add provider-specific variables only in deployment or local configuration. Core does not forward its entire environment.
- Model selections can be passed through the configuration argument of open/resume.

## Process-local limits

The journal retains at most 10,000 events or 16 MiB per session, with 16 bounded
subscriber queues and 100 terminal journals. It retains 10,000 consumed resume
tokens for the process lifetime; reaching that limit rejects further claims.
The turn registry retains up to 1,000 handles, including pending admissions.

State is not persisted. Initialization has no recovered snapshots, and an
unclean restart does not guarantee orphan-process cleanup. These APIs are not
restart-safe or ready for multiple Core replicas.
