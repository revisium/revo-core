import { Field, ID, InputType } from '@nestjs/graphql';

import { WorkspaceType } from '../../../../features/workspace/contracts/workspace.contracts.js';

@InputType()
export class CreateWorkspaceInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => WorkspaceType)
  type: WorkspaceType;

  @Field(() => String)
  sourcePath: string;
}
