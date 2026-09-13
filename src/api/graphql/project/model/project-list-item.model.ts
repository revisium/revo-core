import { Field, ObjectType } from '@nestjs/graphql';

import { ProjectSummaryModel } from './project-summary.model.js';
import { ProjectModel } from './project.model.js';

@ObjectType()
export class ProjectListItemModel extends ProjectModel {
  @Field(() => ProjectSummaryModel)
  summary: ProjectSummaryModel;
}
