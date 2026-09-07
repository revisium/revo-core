import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

export interface RequestDialogueInteractionCommandData {
  readonly event: Extract<AgentSessionEvent, { readonly type: 'interaction.requested' }>;
  readonly expected: AgentSessionEventAppendPrecondition;
  readonly signal: AbortSignal;
}

export type RequestDialogueInteractionCommandReturnType = AgentSessionEventAppendResult;

export class RequestDialogueInteractionCommand {
  constructor(readonly data: RequestDialogueInteractionCommandData) {}
}
