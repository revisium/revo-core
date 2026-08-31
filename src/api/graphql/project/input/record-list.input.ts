import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class RecordListInput {
  @Field(() => Int, { nullable: true })
  first?: number;

  @Field(() => String, { nullable: true })
  after?: string;
}
