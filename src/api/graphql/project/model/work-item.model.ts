import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('WorkItem')
export class WorkItemModel {
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

  @Field(() => [String])
  dependsOn: string[];

  @Field(() => [String])
  relatedRequirements: string[];

  @Field(() => [String])
  relatedAdr: string[];
}
