import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AgentPlanItemModel } from './agent-plan-item.model.js';
import { AgentSessionEventModel } from './agent-session-event.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class PlanUpdatedEventModel extends AgentSessionEventModel {
  @Field(() => ID)
  turnId: string;

  @Field(() => [AgentPlanItemModel])
  items: readonly AgentPlanItemModel[];
}
