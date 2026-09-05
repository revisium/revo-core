import { Field, ObjectType } from '@nestjs/graphql';

import { AgentSessionEventModel } from './agent-session-event.model.js';
import { AgentSessionPinModel } from './agent-session-pin.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class SessionAcceptedEventModel extends AgentSessionEventModel {
  @Field(() => AgentSessionPinModel)
  pin: AgentSessionPinModel;

  @Field(() => Boolean)
  resumed: boolean;
}
