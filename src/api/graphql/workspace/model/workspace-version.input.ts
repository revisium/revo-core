import { Field, ID, Int, InputType } from '@nestjs/graphql';

@InputType()
export class WorkspaceVersionInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => ID)
  id: string;

  @Field(() => Int)
  expectedVersion: number;
}
