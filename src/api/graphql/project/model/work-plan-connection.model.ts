import { Field, Int, ObjectType } from '@nestjs/graphql';

import { PageInfoModel } from './page-info.model.js';
import { WorkPlanEdgeModel } from './work-plan-edge.model.js';

@ObjectType('WorkPlanConnection')
export class WorkPlanConnectionModel {
  @Field(() => [WorkPlanEdgeModel])
  edges: WorkPlanEdgeModel[];

  @Field(() => PageInfoModel)
  pageInfo: PageInfoModel;

  @Field(() => Int)
  totalCount: number;
}
