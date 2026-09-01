import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class ProjectInput {
  @Field(() => ID)
  id: string;
}
