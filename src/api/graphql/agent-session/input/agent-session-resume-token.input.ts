import { Field, ID, InputType } from '@nestjs/graphql';

import { AgentSessionEventCursorInput } from './agent-session-event-cursor.input.js';
import { AgentSessionPinInput } from './agent-session-pin.input.js';

@InputType()
export class AgentSessionResumeTokenInput {
  @Field()
  schemaVersion: 'agent-session-resume-token/v1';
  @Field(() => ID)
  sessionId: string;
  @Field(() => ID)
  resumeTokenId: string;
  @Field()
  eligibility: 'hibernated';
  @Field(() => AgentSessionPinInput)
  pin: AgentSessionPinInput;
  @Field(() => AgentSessionEventCursorInput)
  cursor: AgentSessionEventCursorInput;
  @Field()
  payload: string;
  @Field()
  sha256: string;
}
