import { Field, ObjectType } from '@nestjs/graphql';

import { AgentConfigurationGroupModel } from './agent-configuration-group.model.js';

@ObjectType()
export class AgentConfigurationValueModel {
  @Field(() => String)
  value: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => AgentConfigurationGroupModel, { nullable: true })
  group?: AgentConfigurationGroupModel;
}
