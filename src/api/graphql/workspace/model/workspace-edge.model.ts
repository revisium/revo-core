import { Field, ObjectType } from '@nestjs/graphql';

import { WorkspaceModel } from './workspace.model.js';

@ObjectType()
export class WorkspaceEdgeModel {
  @Field(() => String)
  cursor: string;

  @Field(() => WorkspaceModel)
  node: WorkspaceModel;
}
