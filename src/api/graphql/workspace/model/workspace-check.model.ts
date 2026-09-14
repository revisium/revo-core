import { Field, ObjectType } from '@nestjs/graphql';

import { WorkspaceAvailability } from '../../../../features/workspace/contracts/workspace.contracts.js';

@ObjectType()
export class WorkspaceCheckModel {
  @Field(() => WorkspaceAvailability)
  availability: WorkspaceAvailability;

  @Field(() => String, { nullable: true })
  errorCode: string | null;
}
