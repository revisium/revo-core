import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ProjectListInput {
  @Field(() => Int, { nullable: true })
  first?: number;

  @Field(() => String, { nullable: true })
  after?: string;

  @Field(() => Boolean, { nullable: true })
  includeArchived?: boolean;

  @Field(() => String, { nullable: true })
  query?: string;
}
