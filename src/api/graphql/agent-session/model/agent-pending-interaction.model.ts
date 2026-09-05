import { Field, ObjectType } from '@nestjs/graphql';

import { AgentInputRequestModel } from './agent-input-request.model.js';
import { AgentInteractionRequestUnion } from './agent-interaction-request.union.js';
import { AgentInteractionScopeModel } from './agent-interaction-scope.model.js';
import { AgentPermissionRequestModel } from './agent-permission-request.model.js';

@ObjectType()
export class AgentPendingInteractionModel {
  @Field(() => AgentInteractionScopeModel)
  scope: AgentInteractionScopeModel;

  @Field(() => AgentInteractionRequestUnion)
  request: AgentPermissionRequestModel | AgentInputRequestModel;

  @Field(() => String)
  state: string;
}
