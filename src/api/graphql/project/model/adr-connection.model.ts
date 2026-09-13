import { Field, Int, ObjectType } from '@nestjs/graphql';

import { PageInfoModel } from '../../share/page-info.model.js';
import { AdrEdgeModel } from './adr-edge.model.js';

@ObjectType()
export class AdrConnectionModel {
  @Field(() => [AdrEdgeModel])
  edges: AdrEdgeModel[];

  @Field(() => PageInfoModel)
  pageInfo: PageInfoModel;

  @Field(() => Int)
  totalCount: number;
}
