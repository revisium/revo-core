import { Field, ID, InputType, Int } from '@nestjs/graphql';
import type { RunStatus } from '@revisium/revo-run';

@InputType()
export class RunListInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => [String], { nullable: true })
  statuses?: RunStatus[];

  @Field(() => Int, { nullable: true })
  first?: number;

  @Field(() => String, { nullable: true })
  after?: string;
}
