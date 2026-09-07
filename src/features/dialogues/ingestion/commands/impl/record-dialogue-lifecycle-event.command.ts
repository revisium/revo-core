import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

type RecordDialogueLifecycleEventEvent = Extract<
  AgentSessionEvent,
  {
    readonly type:
      | 'session.accepted'
      | 'session.opened'
      | 'session.checkpointed'
      | 'session.hibernated';
  }
>;

export interface RecordDialogueLifecycleEventCommandData {
  readonly event: RecordDialogueLifecycleEventEvent;
  readonly expected: AgentSessionEventAppendPrecondition;
  readonly signal: AbortSignal;
}

export type RecordDialogueLifecycleEventCommandReturnType = AgentSessionEventAppendResult;

export class RecordDialogueLifecycleEventCommand {
  constructor(readonly data: RecordDialogueLifecycleEventCommandData) {}
}
