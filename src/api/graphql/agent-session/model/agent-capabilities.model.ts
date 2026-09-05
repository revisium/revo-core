import { Field, ObjectType } from '@nestjs/graphql';

import { AgentSessionCapabilitiesModel } from './agent-session-capabilities.model.js';

@ObjectType()
export class AgentCapabilitiesModel {
  @Field(() => Boolean)
  cancellation: boolean;

  @Field(() => Boolean)
  structuredResult: boolean;

  @Field(() => Boolean)
  usage: boolean;

  @Field(() => AgentSessionCapabilitiesModel)
  session: AgentSessionCapabilitiesModel;
}
