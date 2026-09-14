import { Field, ID, Int, InputType } from '@nestjs/graphql';

@InputType()
export class WorkspaceListInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => Int, { nullable: true })
  first?: number;

  @Field(() => String, { nullable: true })
  after?: string;

  @Field(() => Boolean, { nullable: true })
  includeArchived?: boolean;
}
