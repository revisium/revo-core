import { Field, ObjectType } from '@nestjs/graphql';

import { AgentInteractionCapabilitiesModel } from './agent-interaction-capabilities.model.js';
import { AgentUpdateCapabilitiesModel } from './agent-update-capabilities.model.js';

@ObjectType()
export class AgentSessionCapabilitiesModel {
  @Field(() => Boolean)
  multiTurn: boolean;

  @Field(() => String)
  resume: string;

  @Field(() => AgentInteractionCapabilitiesModel)
  interactions: AgentInteractionCapabilitiesModel;

  @Field(() => AgentUpdateCapabilitiesModel)
  updates: AgentUpdateCapabilitiesModel;
}
