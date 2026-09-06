# Agent runtime integration

The infrastructure AgentRuntimeModule creates and initializes one AgentManager.
AgentSession handlers consume that manager directly. Run composition creates its
attempt adapter from the same manager and discovered definitions; it does not
depend on the AgentSession feature.

Handlers own use cases. Shared state has separate owners: active-state sinks,
the event journal and session output directories in Core, and turn-handle
retention in agent-runtime.
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
Runtime retains at most 1,000 completed turns and 16 MiB of serialized turn
snapshots across sessions by default. Active turns are excluded from those
retention budgets. Eviction removes lookup access but does not invalidate
previously issued handles or duplicate-turn-ID protection.

Core does not maintain a turn registry. GraphQL `agentSessionTurn`,
`waitForAgentSessionTurn`, and `cancelAgentSessionTurn` require both `sessionId`
and `turnId`; their handlers use runtime `inspectTurn` / `getTurn` directly.
Unknown or evicted lookups return null for inspect and NOT_FOUND for wait/cancel.
Retained results remain available after session close within the runtime limits;
this cache does not replace conversation history.

State is not persisted. Initialization has no recovered snapshots, and an
unclean restart does not guarantee orphan-process cleanup. These APIs are not
restart-safe or ready for multiple Core replicas.
