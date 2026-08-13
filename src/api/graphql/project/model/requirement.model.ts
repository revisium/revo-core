import { Field, ID, ObjectType } from '@nestjs/graphql';

import { RequirementStatus } from './requirement-status.enum.js';

@ObjectType('Requirement')
export class RequirementModel {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => RequirementStatus)
  status: RequirementStatus;

  @Field()
  statement: string;

  @Field()
  acceptance: string;

  @Field(() => [String])
  relatedAdr: string[];
}
