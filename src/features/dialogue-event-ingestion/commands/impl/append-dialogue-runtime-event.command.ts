import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

export interface AppendDialogueRuntimeEventCommandData {
  readonly event: AgentSessionEvent;
  readonly expected: AgentSessionEventAppendPrecondition;
  readonly signal: AbortSignal;
}

export type AppendDialogueRuntimeEventCommandReturnType = AgentSessionEventAppendResult;

export class AppendDialogueRuntimeEventCommand {
  constructor(readonly data: AppendDialogueRuntimeEventCommandData) {}
}
