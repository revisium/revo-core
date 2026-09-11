import { Field, ObjectType } from '@nestjs/graphql';

import { AgentConfigurationValueModel } from './agent-configuration-value.model.js';

@ObjectType()
export class AgentConfigurationProviderModel {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => [AgentConfigurationValueModel])
  models: readonly AgentConfigurationValueModel[];
}
