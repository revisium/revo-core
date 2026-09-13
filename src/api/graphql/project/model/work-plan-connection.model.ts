import { Field, Int, ObjectType } from '@nestjs/graphql';

import { PageInfoModel } from '../../share/page-info.model.js';
import { WorkPlanEdgeModel } from './work-plan-edge.model.js';

@ObjectType()
export class WorkPlanConnectionModel {
  @Field(() => [WorkPlanEdgeModel])
  edges: WorkPlanEdgeModel[];

  @Field(() => PageInfoModel)
  pageInfo: PageInfoModel;

  @Field(() => Int)
  totalCount: number;
}
