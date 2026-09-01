import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class ProjectUpdateInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;
}
