import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

export interface CompleteDialogueAssistantMessageCommandData {
  readonly event: Extract<AgentSessionEvent, { readonly type: 'assistant.message.completed' }>;
  readonly expected: AgentSessionEventAppendPrecondition;
  readonly signal: AbortSignal;
}

export type CompleteDialogueAssistantMessageCommandReturnType = AgentSessionEventAppendResult;

export class CompleteDialogueAssistantMessageCommand {
  constructor(readonly data: CompleteDialogueAssistantMessageCommandData) {}
}
