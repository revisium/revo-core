import { Field, ObjectType } from '@nestjs/graphql';

import { WorkspaceType } from '../../../../features/workspace/contracts/workspace.contracts.js';
import { registerWorkspaceEnums } from '../../workspace/workspace.enums.js';

registerWorkspaceEnums();

@ObjectType()
export class ProjectWorkspaceSummaryModel {
  @Field(() => String)
  name: string;

  @Field(() => WorkspaceType)
  type: WorkspaceType;
}
