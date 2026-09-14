import { Field, ID, ObjectType } from '@nestjs/graphql';

import { WorkspaceType } from '../../../../features/workspace/contracts/workspace.contracts.js';

@ObjectType()
export class WorkspaceModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  projectId: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => WorkspaceType)
  type: WorkspaceType;

  @Field(() => String)
  sourcePath: string;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;

  @Field(() => Boolean)
  isArchived: boolean;

  @Field(() => String, { nullable: true })
  archivedAt: string | null;
}
