import { Field, ID, ObjectType } from '@nestjs/graphql';

import { PublicProjectStatus } from '../../../../features/project/contracts/project.enums.js';
import { ProjectSummaryModel } from './project-summary.model.js';

@ObjectType()
export class ProjectModel {
  @Field(() => ProjectSummaryModel)
  summary?: ProjectSummaryModel;

  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => PublicProjectStatus)
  status: PublicProjectStatus;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;
}
