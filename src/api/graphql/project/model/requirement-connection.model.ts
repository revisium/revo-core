import { Field, Int, ObjectType } from '@nestjs/graphql';

import { PageInfoModel } from './page-info.model.js';
import { RequirementEdgeModel } from './requirement-edge.model.js';

@ObjectType('RequirementConnection')
export class RequirementConnectionModel {
  @Field(() => [RequirementEdgeModel])
  edges: RequirementEdgeModel[];

  @Field(() => PageInfoModel)
  pageInfo: PageInfoModel;

  @Field(() => Int)
  totalCount: number;
}
