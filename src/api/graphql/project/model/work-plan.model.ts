import { Field, ID, ObjectType } from '@nestjs/graphql';

import { WorkPlanStatus } from './work-plan-status.enum.js';

@ObjectType('WorkPlan')
export class WorkPlanModel {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => WorkPlanStatus)
  status: WorkPlanStatus;

  @Field()
  outcome: string;

  @Field()
  bounds: string;

  @Field()
  baselineId: string;

  @Field()
  acceptance: string;
}
