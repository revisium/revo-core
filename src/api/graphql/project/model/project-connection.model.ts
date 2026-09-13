import { Field, Int, ObjectType } from '@nestjs/graphql';

import { PageInfoModel } from '../../share/page-info.model.js';
import { ProjectEdgeModel } from './project-edge.model.js';

@ObjectType()
export class ProjectConnectionModel {
  @Field(() => [ProjectEdgeModel])
  edges: ProjectEdgeModel[];

  @Field(() => PageInfoModel)
  pageInfo: PageInfoModel;

  @Field(() => Int)
  totalCount: number;
}
