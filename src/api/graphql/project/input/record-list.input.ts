import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class RecordListInput {
  @Field(() => Int)
  first: number;

  @Field(() => String, { nullable: true })
  after?: string;
}
