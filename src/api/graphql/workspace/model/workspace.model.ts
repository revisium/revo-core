import { Field, ID, ObjectType } from '@nestjs/graphql';

import {
  WorkspaceType,
  WorkspaceAvailability,
} from '../../../../features/workspace/contracts/workspace.contracts.js';

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

  @Field(() => WorkspaceAvailability)
  availability: WorkspaceAvailability;

  @Field(() => String, { nullable: true })
  lastCheckedAt: string | null;

  @Field(() => String, { nullable: true })
  lastErrorCode: string | null;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;

  @Field(() => String, { nullable: true })
  disconnectedAt: string | null;
}
