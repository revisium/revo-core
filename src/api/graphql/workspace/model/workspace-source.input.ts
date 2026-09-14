import { Field, InputType } from '@nestjs/graphql';

import { WorkspaceType } from '../../../../features/workspace/contracts/workspace.contracts.js';

@InputType()
export class WorkspaceSourceInput {
  @Field(() => WorkspaceType)
  type: WorkspaceType;

  @Field(() => String)
  sourcePath: string;
}
