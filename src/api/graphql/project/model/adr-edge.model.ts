import { Field, ObjectType } from '@nestjs/graphql';

import { AdrModel } from './adr.model.js';

@ObjectType('AdrEdge')
export class AdrEdgeModel {
  @Field()
  cursor: string;

  @Field(() => AdrModel)
  node: AdrModel;
}
