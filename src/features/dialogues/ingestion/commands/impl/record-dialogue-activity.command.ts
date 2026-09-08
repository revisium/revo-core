import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

type RecordDialogueActivityEvent = Extract<
  AgentSessionEvent,
  { readonly type: 'tool.activity' | 'plan.updated' | 'usage.updated' }
>;

export interface RecordDialogueActivityCommandData {
  readonly event: RecordDialogueActivityEvent;
  readonly expected: AgentSessionEventAppendPrecondition;
  readonly signal: AbortSignal;
}

export type RecordDialogueActivityCommandReturnType = AgentSessionEventAppendResult;

export class RecordDialogueActivityCommand {
  constructor(readonly data: RecordDialogueActivityCommandData) {}
}
