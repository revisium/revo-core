import { Field, ObjectType } from '@nestjs/graphql';

import { AgentInteractionRequestUnion } from './agent-interaction-request.union.js';
import { AgentInteractionScopeModel } from './agent-interaction-scope.model.js';
import { AgentSessionEventModel } from './agent-session-event.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class InteractionRequestedEventModel extends AgentSessionEventModel {
  @Field(() => AgentInteractionScopeModel)
  scope: AgentInteractionScopeModel;

  @Field(() => AgentInteractionRequestUnion)
  request: typeof AgentInteractionRequestUnion;
}
