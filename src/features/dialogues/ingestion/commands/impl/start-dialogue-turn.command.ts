import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

export interface StartDialogueTurnCommandData {
  readonly event: Extract<AgentSessionEvent, { readonly type: 'turn.started' }>;
  readonly expected: AgentSessionEventAppendPrecondition;
  readonly signal: AbortSignal;
}

export type StartDialogueTurnCommandReturnType = AgentSessionEventAppendResult;

export class StartDialogueTurnCommand {
  constructor(readonly data: StartDialogueTurnCommandData) {}
}
