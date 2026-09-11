import { Field, ObjectType } from '@nestjs/graphql';

import { AgentConfigurationValueModel } from './agent-configuration-value.model.js';

@ObjectType()
export class AgentConfigurationKnownModel extends AgentConfigurationValueModel {
  @Field(() => Boolean)
  connected: boolean;
}
