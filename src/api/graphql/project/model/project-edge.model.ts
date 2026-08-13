import { Field, ObjectType } from '@nestjs/graphql';

import { ProjectModel } from './project.model.js';

@ObjectType()
export class ProjectEdgeModel {
  @Field()
  cursor: string;

  @Field(() => ProjectModel)
  node: ProjectModel;
}
