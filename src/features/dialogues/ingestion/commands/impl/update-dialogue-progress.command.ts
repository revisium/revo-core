import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

export interface UpdateDialogueProgressCommandData {
  readonly event: Extract<AgentSessionEvent, { readonly type: 'agent.progress' }>;
  readonly expected: AgentSessionEventAppendPrecondition;
  readonly signal: AbortSignal;
}

export type UpdateDialogueProgressCommandReturnType = AgentSessionEventAppendResult;

export class UpdateDialogueProgressCommand {
  constructor(readonly data: UpdateDialogueProgressCommandData) {}
}
