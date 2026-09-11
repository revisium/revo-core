import { Field, ObjectType } from '@nestjs/graphql';

import { AgentConfigurationKnownModel } from './agent-configuration-known-model.model.js';

@ObjectType()
export class AgentConfigurationProviderModel {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => Boolean)
  connected: boolean;

  @Field(() => [AgentConfigurationKnownModel])
  models: readonly AgentConfigurationKnownModel[];
}
