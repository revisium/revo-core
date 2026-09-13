import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class WorkspaceInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => ID)
  id: string;
}
