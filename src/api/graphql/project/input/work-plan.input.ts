import { Field, ID, InputType } from '@nestjs/graphql';

import { WorkPlanStatus } from '../model/work-plan-status.enum.js';

@InputType()
export class WorkPlanInput {
  @Field(() => ID)
  projectId: string;

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
