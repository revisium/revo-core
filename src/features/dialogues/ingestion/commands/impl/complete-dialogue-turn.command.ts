import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

export interface CompleteDialogueTurnCommandData {
  readonly event: Extract<AgentSessionEvent, { readonly type: 'turn.completed' }>;
  readonly expected: AgentSessionEventAppendPrecondition;
  readonly signal: AbortSignal;
}

export type CompleteDialogueTurnCommandReturnType = AgentSessionEventAppendResult;

export class CompleteDialogueTurnCommand {
  constructor(readonly data: CompleteDialogueTurnCommandData) {}
}
