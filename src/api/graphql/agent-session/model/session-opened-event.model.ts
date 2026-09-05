import { Field, ObjectType } from '@nestjs/graphql';

import { AgentSessionCapabilitiesModel } from './agent-session-capabilities.model.js';
import { AgentSessionEventModel } from './agent-session-event.model.js';
import { AgentSessionPinModel } from './agent-session-pin.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class SessionOpenedEventModel extends AgentSessionEventModel {
  @Field(() => AgentSessionPinModel)
  pin: AgentSessionPinModel;

  @Field(() => Boolean)
  resumed: boolean;

  @Field(() => AgentSessionCapabilitiesModel)
  capabilities: AgentSessionCapabilitiesModel;
}
