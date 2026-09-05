import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AgentSessionCapabilitiesModel } from './agent-session-capabilities.model.js';
import { AgentSessionPinModel } from './agent-session-pin.model.js';

@ObjectType()
export class AgentSessionOpenedModel {
  @Field(() => ID)
  sessionId: string;
  @Field(() => AgentSessionPinModel)
  pin: AgentSessionPinModel;
  @Field(() => AgentSessionCapabilitiesModel)
  capabilities: AgentSessionCapabilitiesModel;
}
