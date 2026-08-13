import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class RecordDeleteInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => ID)
  id: string;
}
