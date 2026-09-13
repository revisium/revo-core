import { Field, ObjectType } from '@nestjs/graphql';

import { ProjectListItemModel } from './project-list-item.model.js';

@ObjectType()
export class ProjectEdgeModel {
  @Field()
  cursor: string;

  @Field(() => ProjectListItemModel)
  node: ProjectListItemModel;
}
