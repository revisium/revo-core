import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class WorkItemInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  cancelled: boolean;

  @Field()
  goal: string;

  @Field()
  inputs: string;

  @Field()
  owner: string;

  @Field()
  constraints: string;

  @Field()
  acceptance: string;

  @Field()
  plan: string;

  @Field(() => [String], { nullable: true })
  dependsOn?: string[];

  @Field(() => [String], { nullable: true })
  relatedRequirements?: string[];

  @Field(() => [String], { nullable: true })
  relatedAdr?: string[];
}
