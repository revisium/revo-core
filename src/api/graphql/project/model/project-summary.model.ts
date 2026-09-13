import { Field, Int, ObjectType } from '@nestjs/graphql';

import { ProjectWorkspaceSummaryModel } from './project-workspace-summary.model.js';

@ObjectType()
export class ProjectSummaryModel {
  @Field(() => [ProjectWorkspaceSummaryModel])
  workspaces: ProjectWorkspaceSummaryModel[];

  @Field(() => Int)
  workspaceCount: number;
}
