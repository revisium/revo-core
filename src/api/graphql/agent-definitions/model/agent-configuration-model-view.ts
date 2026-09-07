import { Field, ObjectType } from '@nestjs/graphql';

import { AgentConfigurationGroupModel } from './agent-configuration-group.model.js';
import { AgentConfigurationProviderModel } from './agent-configuration-provider.model.js';
import { AgentConfigurationValueModel } from './agent-configuration-value.model.js';

@ObjectType()
export class AgentConfigurationModelView {
  @Field(() => String)
  optionId: string;

  @Field(() => String)
  currentModel: string;

  @Field(() => AgentConfigurationGroupModel, { nullable: true })
  currentProvider?: AgentConfigurationGroupModel;

  @Field(() => [AgentConfigurationValueModel])
  sessionAvailable: readonly AgentConfigurationValueModel[];

  @Field(() => [AgentConfigurationProviderModel])
  providers: readonly AgentConfigurationProviderModel[];
}
