import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

export interface AppendDialogueTextDeltaCommandData {
  readonly event: Extract<AgentSessionEvent, { readonly type: 'assistant.message.delta' }>;
  readonly expected: AgentSessionEventAppendPrecondition;
  readonly signal: AbortSignal;
}

export type AppendDialogueTextDeltaCommandReturnType = AgentSessionEventAppendResult;

export class AppendDialogueTextDeltaCommand {
  constructor(readonly data: AppendDialogueTextDeltaCommandData) {}
}
