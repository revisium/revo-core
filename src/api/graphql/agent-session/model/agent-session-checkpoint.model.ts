import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AgentSessionEventCursorModel } from './agent-session-event-cursor.model.js';
import { AgentSessionPinModel } from './agent-session-pin.model.js';

@ObjectType()
export class AgentSessionCheckpointModel {
  @Field(() => String)
  schemaVersion: string;

  @Field(() => ID)
  sessionId: string;

  @Field(() => String)
  eligibility: string;

  @Field(() => AgentSessionPinModel)
  pin: AgentSessionPinModel;

  @Field(() => AgentSessionEventCursorModel)
  cursor: AgentSessionEventCursorModel;

  @Field(() => String)
  payload: string;

  @Field(() => String)
  sha256: string;

  @Field(() => ID)
  checkpointId: string;
}
