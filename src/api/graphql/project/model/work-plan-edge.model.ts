import { Field, ObjectType } from '@nestjs/graphql';

import { WorkPlanModel } from './work-plan.model.js';

@ObjectType('WorkPlanEdge')
export class WorkPlanEdgeModel {
  @Field()
  cursor: string;

  @Field(() => WorkPlanModel)
  node: WorkPlanModel;
}
