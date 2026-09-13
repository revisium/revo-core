import { Field, ID, Int, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateWorkspaceInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => ID)
  id: string;

  @Field(() => Int)
  expectedVersion: number;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  sourcePath?: string;
}
