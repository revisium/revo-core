import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

export interface CloseDialogueSessionCommandData {
  readonly event: Extract<AgentSessionEvent, { readonly type: 'session.closed' }>;
  readonly expected: AgentSessionEventAppendPrecondition;
  readonly signal: AbortSignal;
}

export type CloseDialogueSessionCommandReturnType = AgentSessionEventAppendResult;

export class CloseDialogueSessionCommand {
  constructor(readonly data: CloseDialogueSessionCommandData) {}
}
