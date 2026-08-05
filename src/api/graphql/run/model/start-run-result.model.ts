import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class StartRunResultModel {
  @Field(() => ID)
  runId: string;
}
