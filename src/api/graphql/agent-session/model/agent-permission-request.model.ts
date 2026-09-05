import { Field, ObjectType } from '@nestjs/graphql';

import { AgentActionModel } from './agent-action.model.js';
import { AgentPermissionOptionModel } from './agent-permission-option.model.js';

@ObjectType()
export class AgentPermissionRequestModel {
  @Field(() => String)
  kind: string;

  @Field(() => String)
  requestId: string;

  @Field(() => AgentActionModel)
  action: AgentActionModel;

  @Field(() => [AgentPermissionOptionModel])
  options: readonly AgentPermissionOptionModel[];
}
