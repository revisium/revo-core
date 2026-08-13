import { Field, Int, ObjectType } from '@nestjs/graphql';

import { PageInfoModel } from './page-info.model.js';
import { WorkItemEdgeModel } from './work-item-edge.model.js';

@ObjectType()
export class WorkItemConnectionModel {
  @Field(() => [WorkItemEdgeModel])
  edges: WorkItemEdgeModel[];

  @Field(() => PageInfoModel)
  pageInfo: PageInfoModel;

  @Field(() => Int)
  totalCount: number;
}
