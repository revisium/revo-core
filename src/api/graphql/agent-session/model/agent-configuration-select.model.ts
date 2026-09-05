import { Field, ObjectType } from '@nestjs/graphql';

import { AgentConfigurationValueModel } from './agent-configuration-value.model.js';

@ObjectType()
export class AgentConfigurationSelectModel {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  currentValue: string;

  @Field(() => [AgentConfigurationValueModel])
  values: readonly AgentConfigurationValueModel[];
}
