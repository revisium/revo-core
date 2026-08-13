import { Field, ObjectType } from '@nestjs/graphql';

import { WorkItemModel } from './work-item.model.js';

@ObjectType('WorkItemEdge')
export class WorkItemEdgeModel {
  @Field()
  cursor: string;

  @Field(() => WorkItemModel)
  node: WorkItemModel;
}
