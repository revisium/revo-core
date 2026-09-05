import { Field, ObjectType } from '@nestjs/graphql';

import { AgentInteractionResponseModel } from './agent-interaction-response.model.js';
import { AgentInteractionScopeModel } from './agent-interaction-scope.model.js';
import { AgentSessionEventModel } from './agent-session-event.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class InteractionResolvedEventModel extends AgentSessionEventModel {
  @Field(() => AgentInteractionScopeModel)
  scope: AgentInteractionScopeModel;

  @Field(() => String)
  requestId: string;

  @Field(() => AgentInteractionResponseModel)
  response: AgentInteractionResponseModel;
}
