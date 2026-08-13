import { Field, Int, ObjectType } from '@nestjs/graphql';

import { AdrEdgeModel } from './adr-edge.model.js';
import { PageInfoModel } from './page-info.model.js';

@ObjectType('AdrConnection')
export class AdrConnectionModel {
  @Field(() => [AdrEdgeModel])
  edges: AdrEdgeModel[];

  @Field(() => PageInfoModel)
  pageInfo: PageInfoModel;

  @Field(() => Int)
  totalCount: number;
}
