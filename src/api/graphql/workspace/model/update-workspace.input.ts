import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateWorkspaceInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  sourcePath?: string;
}
