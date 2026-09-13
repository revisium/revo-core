import { Field, Int, ObjectType } from '@nestjs/graphql';

import { PageInfoModel } from '../../share/page-info.model.js';
import { WorkspaceEdgeModel } from './workspace-edge.model.js';

@ObjectType()
export class WorkspaceConnectionModel {
  @Field(() => [WorkspaceEdgeModel])
  edges: WorkspaceEdgeModel[];

  @Field(() => Int)
  totalCount: number;

  @Field(() => PageInfoModel)
  pageInfo: PageInfoModel;
}
