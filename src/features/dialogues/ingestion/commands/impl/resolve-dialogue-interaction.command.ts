import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

export interface ResolveDialogueInteractionCommandData {
  readonly event: Extract<AgentSessionEvent, { readonly type: 'interaction.resolved' }>;
  readonly expected: AgentSessionEventAppendPrecondition;
  readonly signal: AbortSignal;
}

export type ResolveDialogueInteractionCommandReturnType = AgentSessionEventAppendResult;

export class ResolveDialogueInteractionCommand {
  constructor(readonly data: ResolveDialogueInteractionCommandData) {}
}
